import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpsertWalkInCustomerDto } from "./dto/upsert-walk-in-customer.dto";

@Injectable()
export class CustomerCrmService {
  constructor(private prisma: PrismaService) {}

  async upsertWalkInCustomer(
    shopId: string,
    dto: UpsertWalkInCustomerDto,
  ) {
    const localPhone = dto.phone.replace(/\D/g, "");
    const fullPhone = `${dto.phoneCountryCode}${localPhone}`;
    const existing = await this.prisma.walkInCustomer.findUnique({
      where: {
        createdByShopId_phone: {
          createdByShopId: shopId,
          phone: fullPhone,
        },
      },
    });

    const customer = existing
      ? await this.prisma.walkInCustomer.update({
          where: { id: existing.id },
          data: {
            name: dto.name.trim(),
            phoneCountryCode: dto.phoneCountryCode,
            email: dto.email?.trim() || existing.email,
            address: dto.address?.trim() ?? existing.address,
            city: dto.city?.trim() ?? existing.city,
            country: dto.country?.trim() || existing.country,
            ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
          },
        })
      : await this.prisma.walkInCustomer.create({
          data: {
            phone: fullPhone,
            phoneCountryCode: dto.phoneCountryCode,
            name: dto.name.trim(),
            email: dto.email?.trim() || null,
            address: dto.address?.trim() || "",
            city: dto.city?.trim() || "",
            country: dto.country?.trim() || "",
            notes: dto.notes?.trim() || null,
            createdByShopId: shopId,
          },
        });

    return {
      id: customer.id,
      type: "WALK_IN" as const,
      isRegistered: false,
      name: customer.name,
      phone: customer.phone,
      phoneCountryCode: customer.phoneCountryCode,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      country: customer.country,
    };
  }

  /**
   * Search customers: registered Users + WalkInCustomers
   */
  async searchCustomers(shopId: string, query?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // POS invoices can be created for a registered customer without a
    // marketplace Order. Keep those customers visible in CRM as well.
    const invoiceCustomerStats = await this.prisma.invoice.groupBy({
      by: ["registeredCustomerId"],
      where: {
        shopId,
        registeredCustomerId: { not: null },
        status: { notIn: ["VOID", "CANCELLED"] },
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
      _max: { createdAt: true },
    });
    const invoiceStatsByCustomer = new Map(
      invoiceCustomerStats
        .filter((stat): stat is typeof stat & { registeredCustomerId: string } =>
          Boolean(stat.registeredCustomerId),
        )
        .map((stat) => [stat.registeredCustomerId, stat]),
    );
    const invoiceCustomerIds = [...invoiceStatsByCustomer.keys()];
    const walkInInvoiceStats = await this.prisma.invoice.groupBy({
      by: ["walkInCustomerId"],
      where: {
        shopId,
        walkInCustomerId: { not: null },
        status: { notIn: ["VOID", "CANCELLED"] },
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
      _max: { createdAt: true },
    });
    const invoiceStatsByWalkIn = new Map(
      walkInInvoiceStats
        .filter((stat): stat is typeof stat & { walkInCustomerId: string } =>
          Boolean(stat.walkInCustomerId),
        )
        .map((stat) => [stat.walkInCustomerId, stat]),
    );

    // Search registered customers who have ordered from this shop
    const customerWhere: any = {
      role: "CUSTOMER",
    };

    if (query) {
      customerWhere.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ];
    }

    // Get registered customers who have orders or RFQs with this shop
    const [registeredCustomers, registeredTotal] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          ...customerWhere,
          OR: query
            ? [
                ...customerWhere.OR,
                // Also match customers who have interacted with this shop
              ]
            : undefined,
          AND: [
            {
              OR: [
                { customerOrders: { some: { shopId } } },
                {
                  rfqRequests: {
                    some: { targetedShops: { some: { shopId } } },
                  },
                },
                { id: { in: invoiceCustomerIds } },
              ],
            },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          lastLoginAt: true,
          preferredCurrency: true,
          preferredCountry: true,
          _count: {
            select: {
              customerOrders: { where: { shopId } },
              rfqRequests: { where: { targetedShops: { some: { shopId } } } },
            },
          },
          purchaseStats: {
            orderBy: { totalSpent: "desc" },
            take: 1,
          },
        },
        orderBy: { lastLoginAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.user.count({
        where: {
          ...customerWhere,
          AND: [
            {
              OR: [
                { customerOrders: { some: { shopId } } },
                {
                  rfqRequests: {
                    some: { targetedShops: { some: { shopId } } },
                  },
                },
                { id: { in: invoiceCustomerIds } },
              ],
            },
          ],
        },
      }),
    ]);

    // Also search walk-in customers for this shop
    // Walk-ins are owned by their creating shop. Keep search aligned with
    // profile/orders/stats, all of which enforce the same tenant boundary.
    const walkInWhere: any = { createdByShopId: shopId };
    if (query) {
      walkInWhere.AND = [{
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      }];
    }

    const [walkInCustomers, walkInTotal] = await Promise.all([
      this.prisma.walkInCustomer.findMany({
        where: walkInWhere,
        include: {
          _count: { select: { shopQuotes: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: Math.max(0, skip - registeredTotal),
        take: Math.max(0, limit - registeredCustomers.length),
      }),
      this.prisma.walkInCustomer.count({ where: walkInWhere }),
    ]);

    // Merge into a unified response
    const customers = [
      ...registeredCustomers.map((c) => ({
        id: c.id,
        type: "REGISTERED" as const,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        phone: c.phone,
        country: c.preferredCountry,
        currency: c.preferredCurrency,
        orderCount:
          c._count.customerOrders +
          (invoiceStatsByCustomer.get(c.id)?._count._all || 0),
        rfqCount: c._count.rfqRequests,
        totalSpent:
          (invoiceStatsByCustomer.get(c.id)?._sum.totalAmount || 0) +
          (c.purchaseStats[0]?.totalSpent || 0),
        lastActive:
          invoiceStatsByCustomer.get(c.id)?._max.createdAt ||
          c.lastLoginAt ||
          c.createdAt,
        createdAt: c.createdAt,
      })),
      ...walkInCustomers.map((w) => ({
        id: w.id,
        type: "WALK_IN" as const,
        name: w.name,
        email: w.email,
        phone: w.phone,
        country: w.country,
        currency: null,
        orderCount: invoiceStatsByWalkIn.get(w.id)?._count._all || 0,
        rfqCount: 0,
        totalSpent: invoiceStatsByWalkIn.get(w.id)?._sum.totalAmount || 0,
        quoteCount: w._count.shopQuotes,
        lastActive:
          invoiceStatsByWalkIn.get(w.id)?._max.createdAt || w.updatedAt,
        createdAt: w.createdAt,
      })),
    ];

    return {
      customers,
      total: registeredTotal + walkInTotal,
      page,
      limit,
      totalPages: Math.ceil((registeredTotal + walkInTotal) / limit),
    };
  }

  /**
   * Get detailed customer profile
   */
  async getCustomerProfile(customerId: string, shopId: string) {
    // First try registered user
    const user = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        preferredCurrency: true,
        preferredCountry: true,
        preferredCity: true,
        createdAt: true,
        lastLoginAt: true,
        deliveryAddresses: true,
        purchaseStats: true,
        _count: {
          select: {
            customerOrders: { where: { shopId } },
            rfqRequests: { where: { targetedShops: { some: { shopId } } } },
          },
        },
      },
    });

    if (user) {
      return {
        type: "REGISTERED",
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        currency: user.preferredCurrency,
        country: user.preferredCountry,
        city: user.preferredCity,
        addresses: user.deliveryAddresses,
        purchaseStats: user.purchaseStats,
        orderCount: user._count.customerOrders,
        rfqCount: user._count.rfqRequests,
        lastActive: user.lastLoginAt,
        memberSince: user.createdAt,
      };
    }

    // Try walk-in customer (strictly scoped to this shop)
    const walkIn = await this.prisma.walkInCustomer.findFirst({
      where: { id: customerId, createdByShopId: shopId },
      include: {
        _count: { select: { shopQuotes: true } },
      },
    });

    if (walkIn) {
      const invoiceStats = await this.prisma.invoice.aggregate({
        where: {
          shopId,
          walkInCustomerId: walkIn.id,
          status: { notIn: ["VOID", "CANCELLED"] },
        },
        _count: true,
        _sum: { totalAmount: true },
      });
      return {
        type: "WALK_IN",
        id: walkIn.id,
        name: walkIn.name,
        email: walkIn.email,
        phone: walkIn.phone,
        currency: null,
        country: walkIn.country,
        city: walkIn.city,
        addresses: [
          {
            address: walkIn.address,
            city: walkIn.city,
            country: walkIn.country,
          },
        ],
        purchaseStats: [],
        orderCount: invoiceStats._count,
        rfqCount: 0,
        quoteCount: walkIn._count.shopQuotes,
        notes: walkIn.notes,
        totalSpent: invoiceStats._sum.totalAmount || 0,
        lastActive: walkIn.updatedAt,
        memberSince: walkIn.createdAt,
      };
    }

    return null;
  }

  /**
   * Get customer orders for this shop
   */
  async getCustomerOrders(
    customerId: string,
    shopId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const walkInCustomer = await this.prisma.walkInCustomer.findFirst({
      where: {
        id: customerId,
        createdByShopId: shopId,
      },
      select: { id: true },
    });
    const invoiceCustomerWhere = walkInCustomer
      ? { walkInCustomerId: customerId }
      : { registeredCustomerId: customerId };

    const [orders, total, invoices, invoiceTotal] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId, shopId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalNpr: true,
          displayCurrency: true,
          createdAt: true,
        },
      }),
      this.prisma.order.count({ where: { customerId, shopId } }),
      this.prisma.invoice.findMany({
        where: {
          shopId,
          ...invoiceCustomerWhere,
          status: { notIn: ["VOID", "CANCELLED"] },
        },
        orderBy: { createdAt: "desc" },
        take: skip + limit,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
        },
      }),
      this.prisma.invoice.count({
        where: {
          shopId,
          ...invoiceCustomerWhere,
          status: { notIn: ["VOID", "CANCELLED"] },
        },
      }),
    ]);

    const invoiceOrders = invoices.map((invoice) => ({
      id: invoice.id,
      orderNumber: invoice.invoiceNumber,
      status: invoice.paymentStatus || invoice.status,
      totalNpr: invoice.totalAmount,
      displayCurrency: invoice.currency,
      createdAt: invoice.createdAt,
      invoiceNumber: invoice.invoiceNumber,
      isInvoice: true,
    }));
    const combinedOrders = [...orders, ...invoiceOrders]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(skip, skip + limit);

    if (total > 0 || invoiceTotal > 0) {
      return {
        orders: combinedOrders,
        total: total + invoiceTotal,
        page,
        limit,
      };
    }

    // If no regular orders found, check if customerId is a walk-in customer ID
    // and return their shop quotes instead
    if (total === 0) {
      const walkIn = await this.prisma.walkInCustomer.findFirst({
        where: { id: customerId, createdByShopId: shopId },
        select: { id: true },
      });

      if (walkIn) {
        const [quotes, quoteTotal] = await Promise.all([
          this.prisma.shopQuote.findMany({
            where: { walkInCustomerId: customerId, shopId },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
            select: {
              id: true,
              quoteNumber: true,
              invoiceNumber: true,
              status: true,
              totalPriceNpr: true,
              balanceDueNpr: true,
              advancePaidNpr: true,
              createdAt: true,
              invoicedAt: true,
            },
          }),
          this.prisma.shopQuote.count({
            where: { walkInCustomerId: customerId, shopId },
          }),
        ]);

        const mappedOrders = quotes.map((q) => ({
          id: q.id,
          orderNumber: q.invoiceNumber ?? q.quoteNumber,
          status: q.status,
          totalNpr: q.totalPriceNpr,
          displayCurrency: "NPR",
          createdAt: q.createdAt,
          // Extra quote-specific fields
          invoiceNumber: q.invoiceNumber,
          quoteNumber: q.quoteNumber,
          balanceDueNpr: q.balanceDueNpr,
          advancePaidNpr: q.advancePaidNpr,
          invoicedAt: q.invoicedAt,
          isQuote: true,
        }));

        return { orders: mappedOrders, total: quoteTotal, page, limit };
      }
    }

    return { orders: combinedOrders, total: total + invoiceTotal, page, limit };
  }

  /**
   * Get customer purchase stats for this shop
   */
  async getCustomerStats(customerId: string, shopId: string) {
    const walkInCustomer = await this.prisma.walkInCustomer.findFirst({
      where: {
        id: customerId,
        createdByShopId: shopId,
      },
      select: { id: true },
    });
    const invoiceCustomerWhere = walkInCustomer
      ? { walkInCustomerId: customerId }
      : { registeredCustomerId: customerId };
    // Get orders aggregated
    const orderStats = await this.prisma.order.aggregate({
      where: { customerId, shopId, status: { in: ["DELIVERED", "COMPLETED"] } },
      _sum: { totalNpr: true },
      _count: true,
      _avg: { totalNpr: true },
    });

    const invoiceStats = await this.prisma.invoice.aggregate({
      where: {
        shopId,
        ...invoiceCustomerWhere,
        status: { notIn: ["VOID", "CANCELLED"] },
      },
      _sum: { totalAmount: true },
      _count: true,
      _avg: { totalAmount: true },
    });

    if (orderStats._count === 0 && invoiceStats._count === 0) {
      // It might be a walk in customer, check quotes
      const walkIn = await this.prisma.walkInCustomer.findFirst({
        where: { id: customerId, createdByShopId: shopId },
      });

      if (walkIn) {
        const quoteStats = await this.prisma.shopQuote.aggregate({
          where: { walkInCustomerId: customerId, shopId, status: { in: ["CONFIRMED", "IN_PROGRESS", "READY", "COMPLETED"] } },
          _sum: { totalPriceNpr: true },
          _count: true,
          _avg: { totalPriceNpr: true },
        });

        const [firstQuote, lastQuote] = await Promise.all([
          this.prisma.shopQuote.findFirst({
            where: { walkInCustomerId: customerId, shopId },
            orderBy: { createdAt: "asc" },
            select: { createdAt: true },
          }),
          this.prisma.shopQuote.findFirst({
            where: { walkInCustomerId: customerId, shopId },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
        ]);

        return {
          totalOrders: quoteStats._count,
          totalSpent: quoteStats._sum?.totalPriceNpr || 0,
          averageOrderValue: quoteStats._avg?.totalPriceNpr || 0,
          firstOrderDate: firstQuote?.createdAt,
          lastOrderDate: lastQuote?.createdAt,
          activeRfqs: 0,
          purchaseStats: [],
        };
      }
    }

    // Get first & last order/invoice dates.
    const [firstOrder, firstInvoice, lastInvoice, lastOrder] = await Promise.all([
      this.prisma.order.findFirst({
        where: { customerId, shopId },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      this.prisma.invoice.findFirst({
        where: {
          shopId,
          ...invoiceCustomerWhere,
          status: { notIn: ["VOID", "CANCELLED"] },
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      this.prisma.invoice.findFirst({
        where: {
          shopId,
          ...invoiceCustomerWhere,
          status: { notIn: ["VOID", "CANCELLED"] },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      this.prisma.order.findFirst({
        where: { customerId, shopId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    // Get active RFQs
    const activeRfqs = await this.prisma.rfqRequest.count({
      where: {
        customerId,
        targetedShops: { some: { shopId } },
        status: { in: ["SENT_TO_SHOPS", "OFFERS_RECEIVED", "OFFER_SELECTED"] },
      },
    });

    // Get purchase stats from table
    const purchaseStats = await this.prisma.customerPurchaseStats.findMany({
      where: { customerId },
    });

    return {
      totalOrders: orderStats._count + invoiceStats._count,
      totalSpent:
        (orderStats._sum?.totalNpr || 0) +
        (invoiceStats._sum?.totalAmount || 0),
      averageOrderValue:
        orderStats._count + invoiceStats._count > 0
          ? ((orderStats._sum?.totalNpr || 0) +
              (invoiceStats._sum?.totalAmount || 0)) /
            (orderStats._count + invoiceStats._count)
          : 0,
      firstOrderDate:
        [firstOrder?.createdAt, firstInvoice?.createdAt]
          .filter((date): date is Date => Boolean(date))
          .sort((a, b) => a.getTime() - b.getTime())[0],
      lastOrderDate:
        [lastOrder?.createdAt, lastInvoice?.createdAt]
          .filter((date): date is Date => Boolean(date))
          .sort((a, b) => b.getTime() - a.getTime())[0],
      activeRfqs,
      purchaseStats,
    };
  }

  /**
   * Add a note to a customer
   */
  async addNote(
    customerId: string,
    shopId: string,
    authorId: string,
    note: string,
    category = "GENERAL",
  ) {
    return this.prisma.customerNote.create({
      data: {
        customerId,
        shopId,
        authorId,
        note,
        category,
      },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Get notes for a customer from this shop
   */
  async getNotes(customerId: string, shopId: string) {
    return this.prisma.customerNote.findMany({
      where: { customerId, shopId },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
