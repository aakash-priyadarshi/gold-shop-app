import type { PosSalePayload } from "@/lib/api";
import { enqueue } from "./sync";

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
): Promise<{ clientId: string; queuedOffline: boolean }> {
  const online =
    typeof navigator === "undefined" ? true : navigator.onLine;

  const clientId = await enqueue({
    entity: "sale",
    method: "POST",
    endpoint: "/pos/sale",
    body: {
      ...payload,
      occurredOffline: !online,
      soldAt: new Date().toISOString(),
    },
  });

  return { clientId, queuedOffline: !online };
}
