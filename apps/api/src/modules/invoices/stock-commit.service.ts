import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export interface StockCommitLine {
  inventoryItemId: string;
  variantId?: string | null;
  quantity: number;
  label?: string;
}

export interface StockCommitOpts {
  shopId: string;
  lines: StockCommitLine[];
  reason: "POS_SALE" | "INVOICE_SALE";
  referenceType: string;
  referenceId: string;
  notes?: string;
  /** When true, clamp stock to 0 instead of rejecting (offline POS). */
  tolerateShortfall?: boolean;
  /** Optional existing transaction client. */
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class StockCommitService {
  constructor(private prisma: PrismaService) {}

  /**
   * Decrement stock for sale lines; cascade SET components to SOLD.
   * Returns labels that shortfell when tolerateShortfall is set.
   */
  async commit(opts: StockCommitOpts): Promise<{ shortfalls: string[] }> {
    const run = async (tx: Prisma.TransactionClient) => {
      const shortfalls: string[] = [];

      for (const line of opts.lines) {
        if (!line.inventoryItemId || line.quantity <= 0) continue;

        await this.assertNotBoundSetComponent(tx, line.inventoryItemId);

        if (line.variantId) {
          const variantUpdate = await tx.productVariant.updateMany({
            where: { id: line.variantId, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (variantUpdate.count === 0) {
            if (!opts.tolerateShortfall) {
              throw new ConflictException(
                `Insufficient stock for ${line.label || line.inventoryItemId}`,
              );
            }
            shortfalls.push(line.label || line.inventoryItemId);
            await tx.productVariant.updateMany({
              where: { id: line.variantId },
              data: { stock: 0 },
            });
          }
        }

        const stockUpdate = await tx.inventoryItem.updateMany({
          where: {
            id: line.inventoryItemId,
            shopId: opts.shopId,
            stockQuantity: { gte: line.quantity },
          },
          data: { stockQuantity: { decrement: line.quantity } },
        });
        if (stockUpdate.count === 0) {
          if (!opts.tolerateShortfall) {
            throw new ConflictException(
              `Insufficient stock for ${line.label || line.inventoryItemId}`,
            );
          }
          if (!shortfalls.includes(line.label || line.inventoryItemId)) {
            shortfalls.push(line.label || line.inventoryItemId);
          }
          await tx.inventoryItem.updateMany({
            where: { id: line.inventoryItemId, shopId: opts.shopId },
            data: { stockQuantity: 0 },
          });
        }

        await this.cascadeSetSaleInTx(
          tx,
          opts.shopId,
          line.inventoryItemId,
          opts.referenceType,
          opts.referenceId,
        );

        // Mark piece SOLD when fully depleted (non-set single pieces)
        const updated = await tx.inventoryItem.findFirst({
          where: { id: line.inventoryItemId, shopId: opts.shopId },
          select: { stockQuantity: true, jewelleryType: true, status: true },
        });
        if (
          updated &&
          updated.jewelleryType !== "SET" &&
          updated.stockQuantity <= 0 &&
          updated.status === "AVAILABLE"
        ) {
          await tx.inventoryItem.update({
            where: { id: line.inventoryItemId },
            data: { status: "SOLD" },
          });
        }
      }

      return shortfalls;
    };

    let shortfalls: string[];
    if (opts.tx) {
      shortfalls = await run(opts.tx);
    } else {
      shortfalls = await this.prisma.$transaction((tx) => run(tx));
    }

    // Movements outside txn so missing table cannot roll back sales
    for (const line of opts.lines) {
      if (!line.inventoryItemId || line.quantity <= 0) continue;
      try {
        await this.prisma.inventoryStockMovement.create({
          data: {
            shopId: opts.shopId,
            inventoryItemId: line.inventoryItemId,
            variantId: line.variantId || null,
            delta: -line.quantity,
            reason: opts.reason,
            referenceType: opts.referenceType,
            referenceId: opts.referenceId,
            notes: opts.notes,
          },
        });
      } catch {
        // InventoryStockMovement may not exist until migrate deploy
      }
    }

    return { shortfalls };
  }

  /**
   * Restore stock for voided invoices (lines with inventoryItemId).
   */
  async restoreForVoid(
    tx: Prisma.TransactionClient,
    shopId: string,
    invoiceId: string,
    lineItems: Array<Record<string, unknown>>,
  ) {
    for (const li of lineItems) {
      const inventoryItemId = li.inventoryItemId as string | undefined;
      const qty = Math.max(0, Number(li.quantity) || 0);
      if (!inventoryItemId || qty <= 0) continue;

      await tx.inventoryItem.updateMany({
        where: { id: inventoryItemId, shopId },
        data: {
          stockQuantity: { increment: qty },
          status: "AVAILABLE",
        },
      });
      if (li.variantId) {
        await tx.productVariant.updateMany({
          where: { id: li.variantId as string },
          data: { stock: { increment: qty } },
        });
      }

      // Restore set components if this was a SET sale
      const set = await tx.inventoryItem.findFirst({
        where: { id: inventoryItemId, shopId, jewelleryType: "SET" },
        include: { setComponents: true },
      });
      if (set) {
        for (const link of set.setComponents) {
          await tx.inventoryItem.update({
            where: { id: link.componentItemId },
            data: { status: "AVAILABLE", stockQuantity: 1 },
          });
        }
      }

      try {
        await tx.inventoryStockMovement.create({
          data: {
            shopId,
            inventoryItemId,
            variantId: (li.variantId as string) || null,
            delta: qty,
            reason: "INVOICE_VOID_RESTORE",
            referenceType: "Invoice",
            referenceId: invoiceId,
          },
        });
      } catch {
        // ignore
      }
    }
  }

  private async assertNotBoundSetComponent(
    tx: Prisma.TransactionClient,
    inventoryItemId: string,
  ) {
    const bound = await tx.inventorySetComponent.findUnique({
      where: { componentItemId: inventoryItemId },
      include: { setItem: { select: { sku: true, nameEn: true } } },
    });
    if (bound) {
      throw new BadRequestException(
        `This piece is part of set "${bound.setItem.nameEn}" (${bound.setItem.sku}). Sell the set or break it first.`,
      );
    }
  }

  private async cascadeSetSaleInTx(
    tx: Prisma.TransactionClient,
    shopId: string,
    setItemId: string,
    referenceType: string,
    referenceId: string,
  ) {
    const set = await tx.inventoryItem.findFirst({
      where: { id: setItemId, shopId },
      include: { setComponents: true },
    });
    if (!set || set.jewelleryType !== "SET") return;

    await tx.inventoryItem.update({
      where: { id: setItemId },
      data: { status: "SOLD" },
    });

    for (const link of set.setComponents) {
      await tx.inventoryItem.update({
        where: { id: link.componentItemId },
        data: { status: "SOLD", stockQuantity: 0 },
      });
      try {
        await tx.inventoryStockMovement.create({
          data: {
            shopId,
            inventoryItemId: link.componentItemId,
            delta: -1,
            reason: "SET_SALE",
            referenceType,
            referenceId,
            notes: `Component of set ${set.sku}`,
          },
        });
      } catch {
        // ignore
      }
    }
  }

  /** Extract unique stock lines from invoice JSON line items. */
  static linesFromInvoiceItems(
    lineItems: unknown,
  ): StockCommitLine[] {
    if (!Array.isArray(lineItems)) return [];
    const map = new Map<string, StockCommitLine>();
    for (const li of lineItems) {
      const inventoryItemId = li?.inventoryItemId as string | undefined;
      const qty = Math.max(0, Number(li?.quantity) || 0);
      if (!inventoryItemId || qty <= 0) continue;
      const key = `${inventoryItemId}:${li.variantId || ""}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += qty;
      } else {
        map.set(key, {
          inventoryItemId,
          variantId: li.variantId || null,
          quantity: qty,
          label: typeof li.label === "string" ? li.label : undefined,
        });
      }
    }
    return [...map.values()];
  }
}
