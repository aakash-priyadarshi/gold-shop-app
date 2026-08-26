import { Prisma } from "@prisma/client";

/** Serializes shop currency rebases with dependent monetary ledger writes. */
export async function acquireShopPriceRebaseLock(
  tx: Prisma.TransactionClient,
  shopId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`shop-price-rebase:${shopId}`}))`;
}
