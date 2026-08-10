import { getApiUrl, rfqApi } from "@/lib/api";

const MAX_BROADCAST_SHOPS = 15;

/**
 * After RFQ creation, broadcast to eligible matching shops so sellers receive it.
 */
export async function broadcastRfqToEligibleShops(
  rfqId: string,
  token: string,
  customerCity?: string,
): Promise<{ shopCount: number }> {
  const API_URL = getApiUrl();
  const eligibleRes = await fetch(
    `${API_URL}/rfq/${rfqId}/eligible-shops${customerCity ? `?customerCity=${encodeURIComponent(customerCity)}` : ""}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!eligibleRes.ok) {
    console.warn("[RFQ Broadcast] eligible-shops failed:", eligibleRes.status);
    return { shopCount: 0 };
  }
  const shops = (await eligibleRes.json()) as Array<{ id: string }>;
  const shopIds = shops.slice(0, MAX_BROADCAST_SHOPS).map((s) => s.id);
  if (!shopIds.length) {
    console.warn("[RFQ Broadcast] no eligible shops for RFQ", rfqId);
    return { shopCount: 0 };
  }
  await rfqApi.broadcast(rfqId, { shopIds });
  console.log(`[RFQ Broadcast] sent to ${shopIds.length} shops`);
  return { shopCount: shopIds.length };
}
