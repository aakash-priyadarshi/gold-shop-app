import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CustomerCrmService {
  constructor(private prisma: PrismaService) {}

  /**
   * Search customers: registered Users + WalkInCustomers
   */
  async searchCustomers(shopId: string, query?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

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
              ],
            },
          ],
        },
      }),
    ]);

    // Also search walk-in customers for this shop
    const walkInWhere: any = {
      createdByShopId: shopId,
    };
    if (query) {
      walkInWhere.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ];
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
        orderCount: c._count.customerOrders,
        rfqCount: c._count.rfqRequests,
        totalSpent: c.purchaseStats[0]?.totalSpent || 0,
        lastActive: c.lastLoginAt || c.createdAt,
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
        orderCount: 0,
        rfqCount: 0,
        totalSpent: 0,
        quoteCount: w._count.shopQuotes,
        lastActive: w.updatedAt,
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

    // Try walk-in customer
    const walkIn = await this.prisma.walkInCustomer.findUnique({
      where: { id: customerId },
      include: {
        _count: { select: { shopQuotes: true } },
      },
    });

    if (walkIn) {
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
        orderCount: 0,
        rfqCount: 0,
        quoteCount: walkIn._count.shopQuotes,
        notes: walkIn.notes,
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

    const [orders, total] = await Promise.all([
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
    ]);

    return { orders, total, page, limit };
  }

  /**
   * Get customer purchase stats for this shop
   */
  async getCustomerStats(customerId: string, shopId: string) {
    // Get orders aggregated
    const orderStats = await this.prisma.order.aggregate({
      where: { customerId, shopId, status: { in: ["DELIVERED", "COMPLETED"] } },
      _sum: { totalNpr: true },
      _count: true,
      _avg: { totalNpr: true },
    });

    // Get first & last order dates
    const [firstOrder, lastOrder] = await Promise.all([
      this.prisma.order.findFirst({
        where: { customerId, shopId },
        orderBy: { createdAt: "asc" },
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
      totalOrders: orderStats._count,
      totalSpent: orderStats._sum?.totalNpr || 0,
      averageOrderValue: orderStats._avg?.totalNpr || 0,
      firstOrderDate: firstOrder?.createdAt,
      lastOrderDate: lastOrder?.createdAt,
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
