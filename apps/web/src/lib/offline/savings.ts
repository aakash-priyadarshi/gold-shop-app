import { api } from "@/lib/api";
import { getDB, type LocalSavingsMember } from "./db";
import { enqueue } from "./sync";

/**
 * Local-first data access for gold savings members.
 *
 * Mirrors the repairs repository: reads from IndexedDB, reconcile on refresh,
 * optimistic + queued writes that replay idempotently via `clientId`.
 */

export type EnrollInput = {
  customerName: string;
  customerPhone?: string;
  schemeType: "DAILY" | "WEEKLY" | "MONTHLY";
  installmentAmount: number;
  totalInstallments: number;
  bonusInstallments: number;
  currency: string;
  startDate: string;
};

function deriveAmounts(m: {
  installmentAmount: number;
  totalInstallments: number;
  bonusInstallments: number;
}) {
  const totalSaved = m.installmentAmount * m.totalInstallments;
  const bonusAmount = m.installmentAmount * m.bonusInstallments;
  return { totalSaved, bonusAmount, payoutTotal: totalSaved + bonusAmount };
}

function computeMaturity(
  start: string,
  schemeType: EnrollInput["schemeType"],
  totalInstallments: number,
): string {
  const d = new Date(start);
  if (schemeType === "DAILY") d.setDate(d.getDate() + totalInstallments);
  else if (schemeType === "WEEKLY") d.setDate(d.getDate() + totalInstallments * 7);
  else d.setMonth(d.getMonth() + totalInstallments);
  return d.toISOString();
}

/** Pull the server list and reconcile it into the local mirror. */
export async function refreshSavings(
  shopId: string,
  status?: string,
): Promise<void> {
  const res = await api.get("/savings-schemes", {
    params: { limit: 50, status },
  });
  const server: any[] =
    res.data?.members ?? res.data?.items ?? res.data ?? [];
  const db = getDB();
  const serverClientIds = new Set<string>(
    server.map((m) => m.clientId).filter(Boolean),
  );

  await db.transaction("rw", db.savingsMembers, async () => {
    const locals = await db.savingsMembers
      .where("shopId")
      .equals(shopId)
      .toArray();
    for (const l of locals) {
      if (l._sync !== "pending") {
        await db.savingsMembers.delete(l.id);
      } else if (l.clientId && serverClientIds.has(l.clientId)) {
        await db.savingsMembers.delete(l.id);
      }
    }
    for (const m of server) {
      await db.savingsMembers.put({
        ...(m as LocalSavingsMember),
        _sync: "synced",
      });
    }
  });
}

/** Enroll a member (optimistic + queued). Works offline. */
export async function enrollMember(
  shopId: string,
  input: EnrollInput,
): Promise<string> {
  const clientId = await enqueue({
    entity: "savingsMember",
    method: "post",
    endpoint: "/savings-schemes",
    body: { ...input },
  });

  const amounts = deriveAmounts(input);
  await getDB().savingsMembers.put({
    id: clientId,
    clientId,
    shopId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    schemeType: input.schemeType,
    installmentAmount: input.installmentAmount,
    installmentsPaid: 0,
    totalInstallments: input.totalInstallments,
    bonusInstallments: input.bonusInstallments,
    currency: input.currency,
    ...amounts,
    startDate: input.startDate,
    maturityDate: computeMaturity(
      input.startDate,
      input.schemeType,
      input.totalInstallments,
    ),
    status: "ACTIVE",
    _sync: "pending",
  });

  return clientId;
}

/** Record one installment payment (optimistic + queued). Works offline. */
export async function recordPayment(memberId: string): Promise<void> {
  const db = getDB();
  const member = await db.savingsMembers.get(memberId);
  if (!member) return;

  // Block payments against a member that hasn't synced yet (no server id).
  if (member._sync === "pending") {
    const nextPaid = Math.min(
      member.installmentsPaid + 1,
      member.totalInstallments,
    );
    await db.savingsMembers.update(memberId, { installmentsPaid: nextPaid });
    return;
  }

  const nextPaid = Math.min(
    member.installmentsPaid + 1,
    member.totalInstallments,
  );
  await db.savingsMembers.update(memberId, {
    installmentsPaid: nextPaid,
    status:
      nextPaid >= member.totalInstallments && member.status === "ACTIVE"
        ? "MATURED"
        : member.status,
  });
  await enqueue({
    entity: "savingsPayment",
    method: "post",
    endpoint: `/savings-schemes/${memberId}/payment`,
    body: {},
  });
}
