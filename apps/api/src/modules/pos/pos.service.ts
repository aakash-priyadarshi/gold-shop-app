import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { InvoicesService } from "../invoices/invoices.service";
import { AddItemsDto } from "./dto/add-items.dto";
import { CheckoutDto, UpdateItemDto } from "./dto/checkout.dto";
import { CreatePosSessionDto } from "./dto/create-session.dto";

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
    const session = await this.getActiveSession(shopId, sessionId);

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
    const session = await this.getActiveSession(shopId, sessionId);

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
      paymentMethod: dto.paymentMethod || null,
      makingChargeRate: makingChargeRate || null,
      makingChargesAmt: makingChargesAmt || null,
    });

    // ── Auto-mark POS counter invoices as PAID ──────────────────
    // Walk-in POS transactions are paid on the spot. We automatically
    // record full payment so the invoice ledger is immediately accurate.
    // Traditional back-office invoices (created via /invoices/create)
    // are NOT affected — they still follow standard credit terms.
    if (invoice.totalAmount > 0) {
      await this.invoicesService.recordPayment(invoice.id, shopId, {
        amount: invoice.totalAmount,
        paymentMethod: dto.paymentMethod || "CASH",
        notes: "Auto-paid at POS counter checkout",
      });
    }

    // Decrement actual stock for each item
    for (const item of session.items) {
      if (item.variantId) {
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.qty } },
        });
      }
      await this.prisma.inventoryItem.update({
        where: { id: item.inventoryItemId },
        data: { stockQuantity: { decrement: item.qty } },
      });
    }

    // Release all reservations (stock is now decremented)
    await this.prisma.stockReservation.deleteMany({
      where: { posSessionId: sessionId },
    });

    // Mark session checked out
    await this.prisma.posSession.update({
      where: { id: sessionId },
      data: { status: "CHECKED_OUT" },
    });

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

  // ─── Cancel Session ───

  async cancelSession(shopId: string, sessionId: string, userId: string) {
    const session = await this.getActiveSession(shopId, sessionId);

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
    // Get current stock
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });
    if (!item) throw new NotFoundException("Inventory item not found");

    let availableStock = item.stockQuantity;

    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });
      if (variant) availableStock = variant.stock;
    }

    // Sum existing reservations for this item (excluding this session)
    const existingReservations = await this.prisma.stockReservation.aggregate({
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
    const sessionReservations = await this.prisma.stockReservation.aggregate({
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
    const existingRes = await this.prisma.stockReservation.findFirst({
      where: {
        posSessionId: sessionId,
        inventoryItemId,
        variantId: variantId || null,
      },
    });

    if (existingRes) {
      await this.prisma.stockReservation.update({
        where: { id: existingRes.id },
        data: { qty: existingRes.qty + qty },
      });
    } else {
      await this.prisma.stockReservation.create({
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
