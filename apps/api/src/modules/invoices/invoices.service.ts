import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PlanLimitsService } from "../subscriptions/plan-limits.service";
import { CreateInvoiceDto, UpdatePaymentDto } from "./dto/invoice.dto";

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private planLimitsService: PlanLimitsService,
  ) {}

  /**
   * Generate a unique invoice number: INV-YYYYMMDD-XXXX
   */
  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `INV-${dateStr}`;

    // Find the latest invoice for today
    const latest = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: "desc" },
    });

    let seq = 1;
    if (latest) {
      const parts = latest.invoiceNumber.split("-");
      seq = parseInt(parts[2] || "0", 10) + 1;
    }

    return `${prefix}-${String(seq).padStart(4, "0")}`;
  }

  async create(shopId: string, dto: CreateInvoiceDto) {
    // ── Plan limit check ──────────────────────────────────────────────
    await this.planLimitsService.checkInvoiceLimit(shopId);

    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate totals from line items
    const lineItems = dto.lineItems || [];
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Tax-exempt sales force tax to zero regardless of submitted rate
    const isTaxExempt = !!dto.isTaxExempt;
    const taxRate = isTaxExempt ? 0 : dto.taxRate || 0;
    const taxAmount = isTaxExempt ? 0 : subtotal * taxRate;
    const discountAmount = dto.discountAmount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        shopId,
        orderId: dto.orderId || null,
        shopQuoteId: dto.shopQuoteId || null,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone || null,
        customerEmail: dto.customerEmail || null,
        customerAddress: dto.customerAddress || null,
        lineItems: lineItems as any,
        subtotal,
        taxAmount,
        taxRate,
        taxLabel: isTaxExempt ? "Tax Exempt" : dto.taxLabel || null,
        discountAmount,
        totalAmount,
        paidAmount: 0,
        balanceDue: totalAmount,
        currency: dto.currency || "NPR",
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes || null,
        terms: dto.terms || null,
        status: "ISSUED",
        issuedAt: new Date(),
        // Tax filing
        isTaxExempt,
        taxExemptReason: dto.taxExemptReason || null,
        customerType: dto.customerType || "B2C",
        customerTaxId: dto.customerTaxId || null,
        invoiceCountry: dto.invoiceCountry || null,
        placeOfSupply: dto.placeOfSupply || null,
        hsnCode: dto.hsnCode || "7113", // default for jewellery
        taxBreakdown: (dto.taxBreakdown as any) || null,
        // POS payment tracking
        paymentMethod: dto.paymentMethod || null,
        makingChargeRate: dto.makingChargeRate ?? null,
        makingChargesAmt: dto.makingChargesAmt ?? null,
      },
    });

    return invoice;
  }

  async findAll(
    shopId: string,
    params?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { status, search, page = 1, limit = 20 } = params || {};

    const where: any = { shopId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, shopId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException("Invoice not found");
    if (invoice.shopId !== shopId)
      throw new ForbiddenException("Not your invoice");
    return invoice;
  }

  async findByOrder(orderId: string, shopId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { orderId, shopId },
      orderBy: { createdAt: "desc" },
    });
    return invoices;
  }

  async recordPayment(id: string, shopId: string, dto: UpdatePaymentDto) {
    const invoice = await this.findById(id, shopId);

    if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
      throw new BadRequestException(
        "Cannot record payment on a voided/cancelled invoice",
      );
    }

    const newPaidAmount = invoice.paidAmount + dto.amount;
    const newBalanceDue = invoice.totalAmount - newPaidAmount;

    let newStatus = invoice.status;
    let newPaymentStatus = invoice.paymentStatus;
    let paidAt: Date | null = null;

    if (newBalanceDue <= 0) {
      newStatus = "PAID";
      newPaymentStatus = "PAID";
      paidAt = new Date();
    } else if (newPaidAmount > 0) {
      newStatus = "PARTIALLY_PAID";
      newPaymentStatus = "PARTIALLY_PAID";
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: Math.min(newPaidAmount, invoice.totalAmount),
        balanceDue: Math.max(newBalanceDue, 0),
        status: newStatus,
        paymentStatus: newPaymentStatus,
        paidAt,
      },
    });
  }

  async voidInvoice(id: string, shopId: string) {
    const invoice = await this.findById(id, shopId);

    if (invoice.status === "PAID") {
      throw new BadRequestException("Cannot void a fully paid invoice");
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: "VOID",
        voidedAt: new Date(),
      },
    });
  }

  async getStats(shopId: string) {
    const [total, issued, paid, partiallyPaid, overdue, voided] =
      await Promise.all([
        this.prisma.invoice.count({ where: { shopId } }),
        this.prisma.invoice.count({ where: { shopId, status: "ISSUED" } }),
        this.prisma.invoice.count({ where: { shopId, status: "PAID" } }),
        this.prisma.invoice.count({
          where: { shopId, status: "PARTIALLY_PAID" },
        }),
        this.prisma.invoice.count({ where: { shopId, status: "OVERDUE" } }),
        this.prisma.invoice.count({ where: { shopId, status: "VOID" } }),
      ]);

    // Revenue totals
    const revenue = await this.prisma.invoice.aggregate({
      where: { shopId, status: { in: ["PAID", "PARTIALLY_PAID", "ISSUED"] } },
      _sum: { totalAmount: true, paidAmount: true, balanceDue: true },
    });

    return {
      counts: { total, issued, paid, partiallyPaid, overdue, voided },
      revenue: {
        totalInvoiced: revenue._sum.totalAmount || 0,
        totalCollected: revenue._sum.paidAmount || 0,
        totalOutstanding: revenue._sum.balanceDue || 0,
      },
    };
  }

  // ── Invoice Settings ──────────────────────────────────────────

  async getSettings(shopId: string) {
    // Return existing settings or create defaults
    let settings = await this.prisma.invoiceSettings.findUnique({
      where: { shopId },
    });

    if (!settings) {
      // Auto-create with shop defaults
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          shopName: true,
          address: true,
          city: true,
          state: true,
          contactPhone: true,
          contactEmail: true,
          panNumber: true,
          vatNumber: true,
          bisLicenseNumber: true,
        },
      });

      settings = await this.prisma.invoiceSettings.create({
        data: {
          shopId,
          shopNameOnBill: shop?.shopName || null,
          shopAddress: shop
            ? [shop.address, shop.city, shop.state].filter(Boolean).join(", ")
            : null,
          shopPhone: shop?.contactPhone || null,
          shopEmail: shop?.contactEmail || null,
          gstin: shop?.vatNumber || shop?.panNumber || null,
          licenseNumber: shop?.bisLicenseNumber || null,
          footerNote: "Thank you for your business!",
          termsText: "All items are subject to hallmarking verification.",
        },
      });
    }

    return settings;
  }

  async updateSettings(shopId: string, dto: any) {
    // Whitelist allowed fields
    const allowedFields = [
      "shopNameOnBill",
      "shopLogoUrl",
      "tagline",
      "shopAddress",
      "shopPhone",
      "shopEmail",
      "gstin",
      "licenseNumber",
      "footerNote",
      "termsText",
      // Per-field positions (TOP or BOTTOM)
      "shopNamePosition",
      "logoPosition",
      "taglinePosition",
      "addressPosition",
      "phonePosition",
      "emailPosition",
      "gstinPosition",
      "licensePosition",
      "footerPosition",
      "termsPosition",
      // Visibility toggles
      "showLogo",
      "showAddress",
      "showPhone",
      "showEmail",
      "showGstin",
      "showLicense",
      "showFooter",
      "showTerms",
    ];

    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        data[field] = dto[field];
      }
    }

    // Validate position fields
    const positionFields = [
      "shopNamePosition",
      "logoPosition",
      "taglinePosition",
      "addressPosition",
      "phonePosition",
      "emailPosition",
      "gstinPosition",
      "licensePosition",
      "footerPosition",
      "termsPosition",
    ];
    for (const field of positionFields) {
      if (data[field] && !["TOP", "BOTTOM"].includes(data[field])) {
        throw new BadRequestException(`${field} must be TOP or BOTTOM`);
      }
    }

    return this.prisma.invoiceSettings.upsert({
      where: { shopId },
      update: data,
      create: {
        shopId,
        ...data,
      },
    });
  }
}
