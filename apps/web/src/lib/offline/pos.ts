import { api, type PosSalePayload } from "@/lib/api";
import { enqueue } from "./sync";

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Offline-capable POS sale.
 *
 * The sale is written to the outbox and replayed against `POST /pos/sale` when
 * the device is online. Because every op carries a client-generated `clientId`,
 * the backend dedupes on it — a replay returns the existing invoice instead of
 * double-selling. The goods physically leave the shop at sale time, so when the
 * device is offline we mark `occurredOffline` so the server tolerates stock
 * shortfalls on replay (flagging them for reconciliation) rather than rejecting.
 *
 * Returns the generated `clientId`, which the caller uses as the local receipt
 * id so the optimistic UI lines up with the eventual server invoice.
 */
export async function createSale(
  payload: Omit<PosSalePayload, "clientId" | "occurredOffline" | "soldAt">,
): Promise<{
  clientId: string;
  queuedOffline: boolean;
  invoice?: Record<string, any>;
}> {
  const online =
    typeof navigator === "undefined" ? true : navigator.onLine;
  const clientId = createClientId();
  const body = {
    ...payload,
    clientId,
    occurredOffline: !online,
    soldAt: new Date().toISOString(),
  };

  // An online counter sale must wait for the authoritative invoice. Only a
  // genuine connectivity failure falls back to the offline outbox; validation
  // and stock errors are surfaced to the shopkeeper instead of showing a false
  // successful bill.
  if (online) {
    try {
      const response = await api.post("/pos/sale", body);
      return {
        clientId,
        queuedOffline: false,
        invoice: response.data?.invoice ?? response.data,
      };
    } catch (error: any) {
      if (error?.response) throw error;
    }
  }

  await enqueue({
    entity: "sale",
    method: "post",
    endpoint: "/pos/sale",
    body: { ...body, occurredOffline: true },
    clientId,
  });

  return { clientId, queuedOffline: true };
}
