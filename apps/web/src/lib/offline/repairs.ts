import { api } from "@/lib/api";
import { getDB, type LocalRepair } from "./db";
import { enqueue } from "./sync";

/**
 * Local-first data access for repair jobs.
 *
 * Reads come from IndexedDB (so the list is instant and works offline); a
 * background `refreshRepairs` reconciles with the server when online. Writes
 * are optimistic: the row is written locally and a mutation is queued in the
 * outbox, which replays with a `clientId` so the server upsert is idempotent.
 */

export type NewRepairInput = {
  customerName: string;
  customerPhone?: string;
  itemDescription: string;
  issueDescription: string;
  estimatedCost?: number;
  expectedReadyDate?: string;
  notes?: string;
};

/** Pull the server list and reconcile it into the local mirror. */
export async function refreshRepairs(shopId: string): Promise<void> {
  const res = await api.get("/repairs", { params: { limit: 50 } });
  const server: any[] = res.data?.items ?? res.data ?? [];
  const db = getDB();
  const serverClientIds = new Set<string>(
    server.map((r) => r.clientId).filter(Boolean),
  );

  await db.transaction("rw", db.repairs, async () => {
    const locals = await db.repairs.where("shopId").equals(shopId).toArray();
    for (const l of locals) {
      // Drop the old synced snapshot (we re-add fresh below) and any pending
      // row that the server has now accepted (its clientId is present server-side).
      if (l._sync !== "pending") {
        await db.repairs.delete(l.id);
      } else if (l.clientId && serverClientIds.has(l.clientId)) {
        await db.repairs.delete(l.id);
      }
    }
    for (const r of server) {
      await db.repairs.put({ ...(r as LocalRepair), _sync: "synced" });
    }
  });
}

/** Create a repair job (optimistic + queued). Works offline. */
export async function createRepair(
  shopId: string,
  input: NewRepairInput,
): Promise<string> {
  const clientId = await enqueue({
    entity: "repair",
    method: "post",
    endpoint: "/repairs",
    body: { ...input, status: "RECEIVED" },
  });

  await getDB().repairs.put({
    id: clientId,
    clientId,
    shopId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    itemDescription: input.itemDescription,
    issueDescription: input.issueDescription,
    status: "RECEIVED",
    estimatedCost: input.estimatedCost,
    expectedReadyDate: input.expectedReadyDate,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    _sync: "pending",
  });

  return clientId;
}

/** Advance a repair job's status (optimistic + queued). Works offline. */
export async function updateRepairStatus(
  id: string,
  status: LocalRepair["status"],
): Promise<void> {
  const db = getDB();
  const row = await db.repairs.get(id);
  // A pending (never-synced) row has no server id yet — block status changes
  // until it has synced to avoid PATCHing a non-existent server record.
  if (row && row._sync === "pending") {
    await db.repairs.update(id, { status });
    return;
  }
  await db.repairs.update(id, { status, _sync: "pending" });
  await enqueue({
    entity: "repairStatus",
    method: "patch",
    endpoint: `/repairs/${id}/status`,
    body: { status },
  });
}
