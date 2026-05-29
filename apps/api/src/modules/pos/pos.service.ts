import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { InvoicesService } from "../invoices/invoices.service";
import { AddItemsDto } from "./dto/add-items.dto";
import { CheckoutDto, UpdateItemDto } from "./dto/checkout.dto";
import { CreatePosSessionDto } from "./dto/create-session.dto";
import { PosSaleDto } from "./dto/pos-sale.dto";

const POS_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class PosService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private invoicesService: InvoicesService,
  ) {}

  // ─── Get Customer Picks (wishlist / liked items visible to this shop) ───

  async getCustomerPicks(shopId: string, customerId: string) {
    // 1. Verify relationship: conversation OR order between this shop and customer
    const hasRelationship = await this.checkShopCustomerRelationship(
      shopId,
      customerId,
    );
    if (!hasRelationship) {
      throw new ForbiddenException(
        "No relationship with this customer. Must have a conversation or order.",
      );
    }

    // 2. Fetch wishlist items that belong to this shop's inventory
    const wishlistItems = await this.prisma.wishlistItem.findMany({
      where: {
        userId: customerId,
        inventoryItem: { shopId },
      },
      include: {
        inventoryItem: {
          include: {
            variants: { where: { isActive: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return wishlistItems;
  }

  // ─── Create POS Session ───

  async createSession(
    shopId: string,
    userId: string,
    dto: CreatePosSessionDto,
  ) {
    // Cancel any existing ACTIVE session for this shop (one at a time)
    await this.prisma.posSession.updateMany({
      where: { shopId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });

    // Release reservations from cancelled sessions
    await this.prisma.stockReservation.deleteMany({
      where: {
        shopId,
        posSession: { status: "CANCELLED" },
      },
    });

    const session = await this.prisma.posSession.create({
      data: {
        shopId,
        customerId: dto.customerId || null,
        conversationId: dto.conversationId || null,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + POS_SESSION_DURATION_MS),
      },
      include: { items: true },
    });

    await this.auditService.log({
      userId,
      action: "POS_SESSION_CREATED",
      resourceType: "PosSession",
      resourceId: session.id,
      metadata: { shopId, customerId: dto.customerId },
    });

    return session;
  }

  // ─── Add Items to Session ───

  async addItems(
    shopId: string,
    sessionId: string,
    userId: string,
    dto: AddItemsDto,
  ) {
    await this.getActiveSession(shopId, sessionId);

    const results = [];

    for (const item of dto.items) {
      // Fetch the inventory item to get unit price
      const inventoryItem = await this.prisma.inventoryItem.findFirst({
        where: { id: item.inventoryItemId, shopId },
      });

      if (!inventoryItem) {
        throw new NotFoundException(
          `Inventory item ${item.inventoryItemId} not found in your shop`,
        );
      }

      // If variant specified, check variant exists and belongs to item
      let variantPrice: number | null = null;
      if (item.variantId) {
        const variant = await this.prisma.productVariant.findFirst({
          where: {
            id: item.variantId,
            inventoryItemId: item.inventoryItemId,
            isActive: true,
          },
        });
        if (!variant) {
          throw new NotFoundException(
            `Variant ${item.variantId} not found or inactive`,
          );
        }
        variantPrice = variant.priceOverride;
      }

      const unitPrice = variantPrice ?? inventoryItem.totalPriceNpr;
      const lineTotal = unitPrice * item.qty;

      // Check available stock (current stock minus existing reservations)
      await this.checkAndReserveStock(
        shopId,
        sessionId,
        item.inventoryItemId,
        item.variantId || null,
        item.qty,
      );

      // Check if item already exists in session (update qty instead of duplicate)
      const existing = await this.prisma.posSessionItem.findFirst({
        where: {
          posSessionId: sessionId,
          inventoryItemId: item.inventoryItemId,
          variantId: item.variantId || null,
        },
      });

      if (existing) {
        const newQty = existing.qty + item.qty;
        const result = await this.prisma.posSessionItem.update({
          where: { id: existing.id },
          data: {
            qty: newQty,
            lineTotal: unitPrice * newQty,
          },
        });
        results.push(result);
      } else {
        const result = await this.prisma.posSessionItem.create({
          data: {
            posSessionId: sessionId,
            inventoryItemId: item.inventoryItemId,
            variantId: item.variantId || null,
            qty: item.qty,
            unitPrice,
            lineTotal,
          },
        });
        results.push(result);
      }
    }

    // Refresh session
    return this.prisma.posSession.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: { id: true, nameEn: true, sku: true, images: true },
            },
            variant: { select: { id: true, sizeLabel: true, sku: true } },
          },
        },
      },
    });
  }

  // ─── Update Item Qty (or remove if qty=0) ───

  async updateItem(
    shopId: string,
    sessionId: string,
    itemId: string,
    dto: UpdateItemDto,
  ) {
    await this.getActiveSession(shopId, sessionId);

    const sessionItem = await this.prisma.posSessionItem.findFirst({
      where: { id: itemId, posSessionId: sessionId },
    });

    if (!sessionItem) {
      throw new NotFoundException("Session item not found");
    }

    if (dto.qty === 0) {
      // Remove item and release its reservation
      await this.prisma.posSessionItem.delete({ where: { id: itemId } });
      await this.prisma.stockReservation.deleteMany({
        where: {
          posSessionId: sessionId,
          inventoryItemId: sessionItem.inventoryItemId,
          variantId: sessionItem.variantId,
        },
      });
      return { removed: true };
    }

    // Adjust reservation for qty difference
    const qtyDiff = dto.qty - sessionItem.qty;
    if (qtyDiff > 0) {
      // Need more stock
      await this.checkAndReserveStock(
        shopId,
        sessionId,
        sessionItem.inventoryItemId,
        sessionItem.variantId,
        qtyDiff,
      );
    } else if (qtyDiff < 0) {
      // Release some reservation
      await this.releasePartialReservation(
        sessionId,
        sessionItem.inventoryItemId,
        sessionItem.variantId,
        Math.abs(qtyDiff),
      );
    }

    return this.prisma.posSessionItem.update({
      where: { id: itemId },
      data: {
        qty: dto.qty,
        lineTotal: sessionItem.unitPrice * dto.qty,
      },
    });
  }

  // ─── Checkout → Create Invoice + Decrement Stock ───

  async checkout(
    shopId: string,
    sessionId: string,
    userId: string,
    dto: CheckoutDto,
  ) {
    const session = await this.prisma.posSession.findFirst({
      where: { id: sessionId, shopId, status: "ACTIVE" },
      include: {
        items: {
          include: {
            inventoryItem: true,
            variant: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException("Active POS session not found");
    }

    if (session.items.length === 0) {
      throw new BadRequestException("Cannot checkout an empty basket");
    }

    // Build invoice line items
    const lineItems: Array<{
      label: string;
      category: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      details?: string;
    }> = session.items.map((item) => ({
      label:
        item.inventoryItem.nameEn +
        (item.variant ? ` (${item.variant.sizeLabel})` : ""),
      category: "PRODUCT",
      quantity: item.qty,
      unitPrice: item.unitPrice,
      amount: item.lineTotal,
      details: item.variant?.sku || item.inventoryItem.sku,
    }));

    // Calculate making charges (percentage on product subtotal)
    const productSubtotal = lineItems.reduce((s, li) => s + li.amount, 0);
    let makingChargesAmt = 0;
    const makingChargeRate = dto.makingChargeRate ?? 0;

    if (dto.makingChargesNpr && dto.makingChargesNpr > 0) {
      // Flat override takes priority
      makingChargesAmt = dto.makingChargesNpr;
    } else if (makingChargeRate > 0) {
      makingChargesAmt = Math.round(productSubtotal * (makingChargeRate / 100));
    }

    // Add making charges as a dedicated line item if applicable
    if (makingChargesAmt > 0) {
      lineItems.push({
        label: `Making Charges (${makingChargeRate}%)`,
        category: "MAKING",
        quantity: 1,
        unitPrice: makingChargesAmt,
        amount: makingChargesAmt,
      });
    }

    // Create invoice via invoices service
    const invoice = await this.invoicesService.create(shopId, {
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      lineItems,
      taxRate: dto.taxRate || 0,
      discountAmount: dto.discountAmount || 0,
      notes: dto.notes || "POS checkout",
      currency: "NPR",
      paymentMethod: dto.paymentMethod || undefined,
      makingChargeRate: makingChargeRate || undefined,
      makingChargesAmt: makingChargesAmt || undefined,
    });

    // Commit stock, release reservations and close the session as ONE atomic
    // unit. Previously these were a loop of independent writes: a failure
    // partway through left some items decremented and others not, with the
    // reservations and session state out of sync. Each decrement is guarded
    // (`stockQuantity >= qty`) so concurrent sessions can never oversell.
    // We commit stock BEFORE recording payment so that, on failure, the
    // invoice is still unpaid and can be cleanly voided (a PAID invoice cannot
    // be voided), leaving no orphaned paid ledger entry for undeducted goods.
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of session.items) {
          if (item.variantId) {
            const variantUpdate = await tx.productVariant.updateMany({
              where: { id: item.variantId, stock: { gte: item.qty } },
              data: { stock: { decrement: item.qty } },
            });
            if (variantUpdate.count === 0) {
              throw new ConflictException(
                `Insufficient stock for ${item.inventoryItem.nameEn}`,
              );
            }
          }

          const stockUpdate = await tx.inventoryItem.updateMany({
            where: {
              id: item.inventoryItemId,
              stockQuantity: { gte: item.qty },
            },
            data: { stockQuantity: { decrement: item.qty } },
          });
          if (stockUpdate.count === 0) {
            throw new ConflictException(
              `Insufficient stock for ${item.inventoryItem.nameEn}`,
            );
          }
        }

        // Release all reservations (stock is now decremented)
        await tx.stockReservation.deleteMany({
          where: { posSessionId: sessionId },
        });

        // Mark session checked out
        await tx.posSession.update({
          where: { id: sessionId },
          data: { status: "CHECKED_OUT" },
        });
      });
    } catch (err) {
      // Stock could not be committed — void the (still unpaid) invoice so we
      // never leave an invoice for goods that were not deducted.
      await this.invoicesService
        .voidInvoice(invoice.id, shopId)
        .catch(() => undefined);
      throw err;
    }

    // ── Auto-mark POS counter invoices as PAID ──────────────────
    // Walk-in POS transactions are paid on the spot. We automatically
    // record full payment so the invoice ledger is immediately accurate.
    // Traditional back-office invoices (created via /invoices/create)
    // are NOT affected — they still follow standard credit terms.
    // Done AFTER the stock commit so a stock failure leaves a voidable invoice.
    if (invoice.totalAmount > 0) {
      await this.invoicesService.recordPayment(invoice.id, shopId, {
        amount: invoice.totalAmount,
        paymentMethod: dto.paymentMethod || "CASH",
        notes: "Auto-paid at POS counter checkout",
      });
    }

    await this.auditService.log({
      userId,
      action: "POS_CHECKOUT",
      resourceType: "PosSession",
      resourceId: sessionId,
      metadata: {
        shopId,
        invoiceId: invoice.id,
        total: invoice.totalAmount,
        paymentMethod: dto.paymentMethod || "CASH",
        makingChargeRate,
        makingChargesAmt,
      },
    });

    return { session: { id: sessionId, status: "CHECKED_OUT" }, invoice };
  }

  // ─── Single-shot, idempotent POS sale (offline-capable) ───
  //
  // Collapses createSession → addItems → checkout into ONE request so the
  // mobile PWA can queue a sale offline and replay it on reconnect. Keyed by
  // `clientId`: a replay returns the existing invoice instead of double-selling.
  async sale(shopId: string, userId: string, dto: PosSaleDto) {
    // 1. Idempotency: a replayed offline sale must not create a second invoice.
    if (dto.clientId) {
      const existing = await this.prisma.invoice.findUnique({
        where: { posClientId: dto.clientId },
      });
      if (existing) {
        if (existing.shopId !== shopId) {
          throw new ForbiddenException("Sale belongs to a different shop");
        }
        return {
          invoice: existing,
          idempotentReplay: true,
        };
      }
    }

    // 2. Resolve line items + prices. Prefer the price the client actually
    //    charged (dto unitPrice) so an offline sale bills the agreed amount;
    //    fall back to the current server price when omitted.
    const resolved: Array<{
      inventoryItemId: string;
      variantId: string | null;
      qty: number;
      unitPrice: number;
      label: string;
      sku?: string;
    }> = [];

    for (const item of dto.items) {
      const inventoryItem = await this.prisma.inventoryItem.findFirst({
        where: { id: item.inventoryItemId, shopId },
      });
      if (!inventoryItem) {
        throw new NotFoundException(
          `Inventory item ${item.inventoryItemId} not found in your shop`,
        );
      }

      let variantPrice: number | null = null;
      let variantLabel = "";
      let variantSku: string | undefined;
      if (item.variantId) {
        const variant = await this.prisma.productVariant.findFirst({
          where: {
            id: item.variantId,
            inventoryItemId: item.inventoryItemId,
          },
        });
        if (!variant) {
          throw new NotFoundException(
            `Variant ${item.variantId} not found for this item`,
          );
        }
        variantPrice = variant.priceOverride;
        variantLabel = variant.sizeLabel ? ` (${variant.sizeLabel})` : "";
        variantSku = variant.sku ?? undefined;
      }

      const unitPrice =
        item.unitPrice ?? variantPrice ?? inventoryItem.totalPriceNpr;

      resolved.push({
        inventoryItemId: item.inventoryItemId,
        variantId: item.variantId || null,
        qty: item.qty,
        unitPrice,
        label: inventoryItem.nameEn + variantLabel,
        sku: variantSku ?? inventoryItem.sku ?? undefined,
      });
    }

    // 3. Build invoice line items (mirror of checkout()).
    const lineItems: Array<{
      label: string;
      category: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      details?: string;
    }> = resolved.map((r) => ({
      label: r.label,
      category: "PRODUCT",
      quantity: r.qty,
      unitPrice: r.unitPrice,
      amount: r.unitPrice * r.qty,
      details: r.sku,
    }));

    const productSubtotal = lineItems.reduce((s, li) => s + li.amount, 0);
    let makingChargesAmt = 0;
    const makingChargeRate = dto.makingChargeRate ?? 0;
    if (dto.makingChargesNpr && dto.makingChargesNpr > 0) {
      makingChargesAmt = dto.makingChargesNpr;
    } else if (makingChargeRate > 0) {
      makingChargesAmt = Math.round(productSubtotal * (makingChargeRate / 100));
    }
    if (makingChargesAmt > 0) {
      lineItems.push({
        label: `Making Charges (${makingChargeRate}%)`,
        category: "MAKING",
        quantity: 1,
        unitPrice: makingChargesAmt,
        amount: makingChargesAmt,
      });
    }

    // 4. Create the invoice (still unpaid, so it can be cleanly voided if the
    //    stock commit fails). On the rare race where a concurrent replay
    //    created the invoice between our idempotency check and here, the unique
    //    posClientId index throws — we recover the winner.
    let invoice;
    try {
      invoice = await this.invoicesService.create(shopId, {
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        lineItems,
        taxRate: dto.taxRate || 0,
        discountAmount: dto.discountAmount || 0,
        notes: dto.notes || "POS sale",
        currency: "NPR",
        paymentMethod: dto.paymentMethod || undefined,
        makingChargeRate: makingChargeRate || undefined,
        makingChargesAmt: makingChargesAmt || undefined,
      });

      if (dto.clientId) {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { posClientId: dto.clientId },
        });
      }
    } catch (err: any) {
      if (dto.clientId && err?.code === "P2002") {
        const winner = await this.prisma.invoice.findUnique({
          where: { posClientId: dto.clientId },
        });
        if (winner) return { invoice: winner, idempotentReplay: true };
      }
      throw err;
    }

    // 5. Commit stock as one atomic unit. For an offline replay the goods
    //    already physically left the shop, so we never reject — we clamp stock
    //    at 0 and flag the discrepancy for later reconciliation. The online
    //    path keeps the guarded behaviour (reject oversell) and voids the
    //    still-unpaid invoice on failure so no orphaned bill remains.
    const shortfalls: string[] = [];
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const r of resolved) {
          if (r.variantId) {
            const variantUpdate = await tx.productVariant.updateMany({
              where: { id: r.variantId, stock: { gte: r.qty } },
              data: { stock: { decrement: r.qty } },
            });
            if (variantUpdate.count === 0) {
              if (!dto.occurredOffline) {
                throw new ConflictException(
                  `Insufficient stock for ${r.label}`,
                );
              }
              shortfalls.push(r.label);
              await tx.productVariant.updateMany({
                where: { id: r.variantId },
                data: { stock: 0 },
              });
            }
          }

          const stockUpdate = await tx.inventoryItem.updateMany({
            where: { id: r.inventoryItemId, stockQuantity: { gte: r.qty } },
            data: { stockQuantity: { decrement: r.qty } },
          });
          if (stockUpdate.count === 0) {
            if (!dto.occurredOffline) {
              throw new ConflictException(`Insufficient stock for ${r.label}`);
            }
            if (!shortfalls.includes(r.label)) shortfalls.push(r.label);
            await tx.inventoryItem.updateMany({
              where: { id: r.inventoryItemId },
              data: { stockQuantity: 0 },
            });
          }
        }
      });
    } catch (err) {
      await this.invoicesService
        .voidInvoice(invoice.id, shopId)
        .catch(() => undefined);
      throw err;
    }

    // Flag offline oversell on the invoice so the shopkeeper can reconcile.
    if (shortfalls.length > 0) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          notes:
            (invoice.notes ? `${invoice.notes} ` : "") +
            `[STOCK RECONCILE: sold offline while out of stock — ${shortfalls.join(", ")}]`,
        },
      });
    }

    // 6. Auto-record full payment (walk-in POS sales are paid on the spot).
    if (invoice.totalAmount > 0) {
      await this.invoicesService.recordPayment(invoice.id, shopId, {
        amount: invoice.totalAmount,
        paymentMethod: dto.paymentMethod || "CASH",
        notes: "Auto-paid at POS counter checkout",
      });
    }

    await this.auditService.log({
      userId,
      action: "POS_SALE",
      resourceType: "Invoice",
      resourceId: invoice.id,
      metadata: {
        shopId,
        total: invoice.totalAmount,
        paymentMethod: dto.paymentMethod || "CASH",
        occurredOffline: !!dto.occurredOffline,
        soldAt: dto.soldAt,
        stockShortfalls: shortfalls,
      },
    });

    return { invoice, stockShortfalls: shortfalls };
  }

  // ─── Cancel Session ───

  async cancelSession(shopId: string, sessionId: string, userId: string) {
    await this.getActiveSession(shopId, sessionId);

    // Release all reservations
    await this.prisma.stockReservation.deleteMany({
      where: { posSessionId: sessionId },
    });

    await this.prisma.posSession.update({
      where: { id: sessionId },
      data: { status: "CANCELLED" },
    });

    await this.auditService.log({
      userId,
      action: "POS_SESSION_CANCELLED",
      resourceType: "PosSession",
      resourceId: sessionId,
      metadata: { shopId },
    });

    return { id: sessionId, status: "CANCELLED" };
  }

  // ─── Get Session with Items ───

  async getSession(shopId: string, sessionId: string) {
    const session = await this.prisma.posSession.findFirst({
      where: { id: sessionId, shopId },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                nameEn: true,
                sku: true,
                images: true,
                totalPriceNpr: true,
                stockQuantity: true,
              },
            },
            variant: {
              select: {
                id: true,
                sizeLabel: true,
                sku: true,
                stock: true,
                priceOverride: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException("POS session not found");
    }

    return session;
  }

  // ─── Get Active Session for Shop ───

  async getActiveSessionForShop(shopId: string) {
    return this.prisma.posSession.findFirst({
      where: { shopId, status: "ACTIVE" },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                nameEn: true,
                sku: true,
                images: true,
                totalPriceNpr: true,
                stockQuantity: true,
              },
            },
            variant: {
              select: {
                id: true,
                sizeLabel: true,
                sku: true,
                stock: true,
                priceOverride: true,
              },
            },
          },
        },
      },
    });
  }

  // ─── Expire Sessions (called by Bull job) ───

  async expireOverdueSessions() {
    const now = new Date();

    const expired = await this.prisma.posSession.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { lt: now },
      },
      select: { id: true },
    });

    if (expired.length === 0) return { expired: 0 };

    const ids = expired.map((s) => s.id);

    // Release all reservations
    await this.prisma.stockReservation.deleteMany({
      where: { posSessionId: { in: ids } },
    });

    // Mark sessions expired
    await this.prisma.posSession.updateMany({
      where: { id: { in: ids } },
      data: { status: "EXPIRED" },
    });

    console.log(`[POS] Expired ${ids.length} sessions`);
    return { expired: ids.length };
  }

  // ─── Private Helpers ───

  private async getActiveSession(shopId: string, sessionId: string) {
    const session = await this.prisma.posSession.findFirst({
      where: { id: sessionId, shopId, status: "ACTIVE" },
    });

    if (!session) {
      throw new NotFoundException(
        "Active POS session not found. It may have expired or been cancelled.",
      );
    }

    // Check expiry
    if (session.expiresAt < new Date()) {
      await this.expireOverdueSessions();
      throw new BadRequestException(
        "POS session has expired. Please create a new one.",
      );
    }

    return session;
  }

  private async checkShopCustomerRelationship(
    shopId: string,
    customerId: string,
  ): Promise<boolean> {
    // Check for conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: { shopId, buyerId: customerId },
    });
    if (conversation) return true;

    // Check for order
    const order = await this.prisma.order.findFirst({
      where: { shopId, customerId },
    });
    if (order) return true;

    return false;
  }

  private async checkAndReserveStock(
    shopId: string,
    sessionId: string,
    inventoryItemId: string,
    variantId: string | null,
    qty: number,
  ) {
    // The whole "read availability → sum reservations → write reservation"
    // sequence must be atomic, otherwise two concurrent sessions can both read
    // the same availability and each reserve the last unit (over-reservation,
    // which later surfaces as oversell at checkout). Serializable isolation
    // makes the aggregate reads + write behave as one conflict-detected unit.
    await this.prisma.$transaction(
      async (tx) => {
        // Get current stock
        const item = await tx.inventoryItem.findUnique({
          where: { id: inventoryItemId },
        });
        if (!item) throw new NotFoundException("Inventory item not found");

        let availableStock = item.stockQuantity;

        if (variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: variantId },
          });
          if (variant) availableStock = variant.stock;
        }

        // Sum existing reservations for this item (excluding this session)
        const existingReservations = await tx.stockReservation.aggregate({
          where: {
            inventoryItemId,
            variantId: variantId || null,
            posSessionId: { not: sessionId },
          },
          _sum: { qty: true },
        });

        const reserved = existingReservations._sum.qty || 0;
        const effective = availableStock - reserved;

        // Also sum this session's existing reservations for this item
        const sessionReservations = await tx.stockReservation.aggregate({
          where: {
            inventoryItemId,
            variantId: variantId || null,
            posSessionId: sessionId,
          },
          _sum: { qty: true },
        });
        const alreadyReserved = sessionReservations._sum.qty || 0;

        if (effective - alreadyReserved < qty) {
          throw new BadRequestException(
            `Insufficient stock for item. Available: ${effective - alreadyReserved}, Requested: ${qty}`,
          );
        }

        // Upsert reservation
        const existingRes = await tx.stockReservation.findFirst({
          where: {
            posSessionId: sessionId,
            inventoryItemId,
            variantId: variantId || null,
          },
        });

        if (existingRes) {
          await tx.stockReservation.update({
            where: { id: existingRes.id },
            data: { qty: existingRes.qty + qty },
          });
        } else {
          await tx.stockReservation.create({
            data: {
              shopId,
              posSessionId: sessionId,
              inventoryItemId,
              variantId,
              qty,
              expiresAt: new Date(Date.now() + POS_SESSION_DURATION_MS),
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async releasePartialReservation(
    sessionId: string,
    inventoryItemId: string,
    variantId: string | null,
    qty: number,
  ) {
    const reservation = await this.prisma.stockReservation.findFirst({
      where: {
        posSessionId: sessionId,
        inventoryItemId,
        variantId: variantId || null,
      },
    });

    if (!reservation) return;

    if (reservation.qty <= qty) {
      await this.prisma.stockReservation.delete({
        where: { id: reservation.id },
      });
    } else {
      await this.prisma.stockReservation.update({
        where: { id: reservation.id },
        data: { qty: reservation.qty - qty },
      });
    }
  }
}
