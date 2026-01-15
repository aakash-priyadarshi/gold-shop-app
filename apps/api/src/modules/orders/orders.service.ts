import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { OrderStatus, OrderType, MilestoneType } from '@prisma/client';
import {
  CreateInventoryOrderDto,
  CreateCustomOrderDto,
  UpdateOrderStatusDto,
  CreateMilestoneDto,
  OrderFilterDto,
  AdminOrderFilterDto,
  AdminCancelOrderDto,
  AdminUpdateTimelineDto,
  AdminVerifyPaymentDto,
  CreateCounterOfferDto,
  RespondToCounterOfferDto,
} from './dto/order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
  ) {}

  // Generate order number
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  // Create inventory order
  async createInventoryOrder(customerId: string, dto: CreateInventoryOrderDto) {
    // Get inventory item
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: dto.inventoryItemId },
      include: { shop: true },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    if (item.status !== 'AVAILABLE') {
      throw new BadRequestException('Item is not available for purchase');
    }

    if (item.stockQuantity < dto.quantity) {
      throw new BadRequestException(`Only ${item.stockQuantity} items available`);
    }

    // Calculate totals
    const subtotal = item.totalPriceNpr * dto.quantity;
    const tax = item.taxNpr * dto.quantity;
    const total = subtotal + tax;

    // Create order
    const order = await this.prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          orderType: OrderType.INVENTORY,
          customerId,
          shopId: item.shopId,
          inventoryItemId: item.id,
          productSnapshot: {
            sku: item.sku,
            nameEn: item.nameEn,
            nameNe: item.nameNe,
            nameHi: item.nameHi,
            jewelleryType: item.jewelleryType,
            composition: item.composition,
            totalWeightGrams: item.totalWeightGrams,
            images: item.images,
            quantity: dto.quantity,
          },
          subtotalNpr: subtotal,
          taxNpr: tax,
          shippingNpr: 0,
          discountNpr: 0,
          totalNpr: total,
          paymentMethod: 'ONLINE',
          paymentStatus: 'PENDING',
          balanceDueNpr: total,
          shippingAddress: {},
          status: OrderStatus.CREATED,
        },
        include: {
          shop: { select: { id: true, shopName: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Update inventory quantity
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          stockQuantity: { decrement: dto.quantity },
          status: item.stockQuantity - dto.quantity <= 0 ? 'RESERVED' : 'AVAILABLE',
        },
      });

      return newOrder;
    });

    // Notify shop
    await this.notificationsService.create({
      userId: item.shop.userId,
      type: 'SYSTEM_ALERT',
      titleKey: 'notification.order.new.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.order.new.body',
      bodyParams: {
        orderNumber: order.orderNumber,
        itemName: item.nameEn,
        total: total,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    // Send email notifications (non-blocking)
    this.sendOrderEmails(order, item, total).catch(err => 
      this.logger.error(`Failed to send order emails: ${err.message}`)
    );

    return order;
  }

  // Send order confirmation emails
  private async sendOrderEmails(order: any, item: any, total: number) {
    // Get full user details
    const [customer, shopOwner] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: order.customerId }, select: { email: true, firstName: true } }),
      this.prisma.user.findUnique({ where: { id: item.shop.userId }, select: { email: true, firstName: true } }),
    ]);

    if (!customer || !shopOwner) return;

    // Send confirmation to customer
    await this.mailService.sendOrderConfirmation(customer.email, {
      customerName: customer.firstName,
      orderNumber: order.orderNumber,
      items: [{ name: item.nameEn, quantity: 1, price: item.totalPriceNpr }],
      subtotal: item.totalPriceNpr,
      shipping: 0,
      tax: item.taxNpr,
      total: total,
      currency: 'NPR',
      shippingAddress: 'Pending',
      shopName: order.shop.shopName,
    });

    // Send notification to seller
    await this.mailService.sendNewOrderNotification(shopOwner.email, {
      shopOwnerName: shopOwner.firstName,
      orderNumber: order.orderNumber,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      items: [{ name: item.nameEn, quantity: 1, price: item.totalPriceNpr }],
      total: total,
      currency: 'NPR',
      dashboardUrl: 'https://www.orivraa.com/dashboard/shop/orders',
    });
  }

  // Create custom order from RFQ
  async createCustomOrder(customerId: string, dto: CreateCustomOrderDto) {
    // Get RFQ request and offer
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: dto.rfqRequestId },
      include: {
        offers: {
          where: { id: dto.offerId },
          include: { shop: true },
        },
      },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ request not found');
    }

    if (rfq.customerId !== customerId) {
      throw new ForbiddenException('Not your RFQ request');
    }

    const offer = rfq.offers[0];
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'PENDING' && offer.status !== 'ACCEPTED') {
      throw new BadRequestException('Offer is no longer available');
    }

    // Validate pay-at-shop: only allowed for same-city custom orders
    let allowPayAtShop = false;
    if (dto.payAtShop && dto.shippingAddress) {
      // Check if customer is in the same city as the shop
      const shop = await this.prisma.shop.findUnique({
        where: { id: offer.shopId },
        select: { city: true },
      });
      if (shop && shop.city.toLowerCase() === dto.shippingAddress.city.toLowerCase()) {
        allowPayAtShop = true;
      }
    }

    // Create order
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          orderType: OrderType.CUSTOM,
          customerId,
          shopId: offer.shopId,
          rfqOfferId: offer.id,
          productSnapshot: {
            jewelleryType: rfq.jewelleryType,
            buildMethod: rfq.buildMethod,
            composition: offer.confirmedComposition,
            totalWeightGrams: offer.confirmedTotalWeightG,
            goldWeightGrams: offer.confirmedGoldWeightG,
            referenceImages: rfq.referenceImages,
            specialInstructions: rfq.specialInstructions,
          },
          subtotalNpr: offer.totalPriceNpr - offer.taxNpr,
          taxNpr: offer.taxNpr,
          shippingNpr: 0,
          discountNpr: 0,
          totalNpr: offer.totalPriceNpr,
          paymentMethod: allowPayAtShop ? 'PAY_AT_SHOP' : 'ONLINE',
          paymentStatus: allowPayAtShop ? 'PENDING_AT_SHOP' : 'PENDING',
          paidAtShopRequested: allowPayAtShop,
          paidAtShopRequestedAt: allowPayAtShop ? new Date() : undefined,
          bookingFeePaidNpr: 0,
          balanceDueNpr: offer.totalPriceNpr,
          shippingAddress: (dto.shippingAddress || {}) as Record<string, unknown>,
          status: OrderStatus.CREATED,
          bookingExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours for pay-at-shop, 24 for online
        },
        include: {
          shop: { select: { id: true, shopName: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Update offer status
      await tx.rfqOffer.update({
        where: { id: offer.id },
        data: { status: 'SELECTED' },
      });

      // Update RFQ status
      await tx.rfqRequest.update({
        where: { id: rfq.id },
        data: {
          status: 'OFFER_SELECTED',
          selectedOfferId: offer.id,
        },
      });

      return newOrder;
    });

    // Notify shop
    await this.notificationsService.create({
      userId: offer.shop.userId,
      type: 'OFFER_SELECTED',
      titleKey: 'notification.offer.selected.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.offer.selected.body',
      bodyParams: {
        orderNumber: order.orderNumber,
        total: offer.totalPriceNpr,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return order;
  }

  // Find customer orders
  async findCustomerOrders(customerId: string, filters: OrderFilterDto) {
    const { type, status, page = 1, limit = 20 } = filters;

    const where: any = { customerId };
    if (type) where.orderType = type;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          shop: { select: { id: true, shopName: true } },
          milestones: { orderBy: { completedAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Find shop orders
  async findShopOrders(shopId: string, filters: OrderFilterDto) {
    const { type, status, page = 1, limit = 20 } = filters;

    const where: any = { shopId };
    if (type) where.orderType = type;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          milestones: { orderBy: { completedAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Find single order
  async findOne(id: string, userId: string, userRole: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        shop: { select: { id: true, shopName: true, userId: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        milestones: { orderBy: { completedAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access
    if (userRole === 'CUSTOMER' && order.customerId !== userId) {
      throw new ForbiddenException('Not your order');
    }

    if (userRole === 'SHOPKEEPER' && order.shop.userId !== userId) {
      throw new ForbiddenException('Not your shop order');
    }

    return order;
  }

  // Update order status
  async updateStatus(id: string, userId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        shop: { select: { id: true, shopName: true, userId: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify shop ownership
    if (order.shop.userId !== userId) {
      throw new ForbiddenException('Not your shop order');
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      CREATED: ['PAYMENT_PENDING', 'CANCELLED'],
      PAYMENT_PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
      PAID: ['PACKED', 'IN_PRODUCTION'],
      PACKED: ['SHIPPED'],
      IN_PRODUCTION: ['QC_PENDING'],
      QC_PENDING: ['QC_PASSED', 'QC_FAILED'],
      QC_PASSED: ['READY_TO_SHIP'],
      QC_FAILED: ['IN_PRODUCTION'],
      READY_TO_SHIP: ['SHIPPED'],
      SHIPPED: ['OUT_FOR_DELIVERY'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
      DELIVERED: ['COMPLETED'],
    };

    const allowedNext = validTransitions[order.status] || [];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${dto.status}`);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status as OrderStatus,
      },
    });

    // Notify customer
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'SYSTEM_ALERT',
      titleKey: 'notification.order.status.title',
      titleParams: { status: dto.status },
      bodyKey: 'notification.order.status.body',
      bodyParams: {
        orderNumber: order.orderNumber,
        status: dto.status,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return updatedOrder;
  }

  // Add milestone
  async addMilestone(orderId: string, userId: string, dto: CreateMilestoneDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: { select: { id: true, userId: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.shop.userId !== userId) {
      throw new ForbiddenException('Not your shop order');
    }

    const milestone = await this.prisma.orderMilestone.create({
      data: {
        orderId,
        type: MilestoneType.CUSTOM,
        title: dto.title,
        description: dto.description,
        actorType: 'SHOP',
        actorId: userId,
        evidenceUrls: dto.images || [],
        notes: dto.description,
        completedAt: new Date(),
      },
    });

    // Notify customer
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'PRODUCTION_MILESTONE',
      titleKey: 'notification.milestone.title',
      titleParams: { title: dto.title },
      bodyKey: 'notification.milestone.body',
      bodyParams: {
        orderNumber: order.orderNumber,
        milestone: dto.title,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return milestone;
  }

  // Complete milestone
  async completeMilestone(orderId: string, milestoneId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: { select: { id: true, userId: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.shop.userId !== userId) {
      throw new ForbiddenException('Not your shop order');
    }

    const milestone = await this.prisma.orderMilestone.update({
      where: { id: milestoneId },
      data: {
        completedAt: new Date(),
      },
    });

    // Notify customer
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'PRODUCTION_MILESTONE',
      titleKey: 'notification.milestone.complete.title',
      titleParams: { title: milestone.title },
      bodyKey: 'notification.milestone.complete.body',
      bodyParams: {
        orderNumber: order.orderNumber,
        milestone: milestone.title,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return milestone;
  }

  // Cancel order
  async cancelOrder(id: string, userId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        shop: { select: { id: true, shopName: true, userId: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('Not your order');
    }

    // Check if cancellation is allowed
    const cancellableStatuses = ['CREATED', 'PAYMENT_PENDING'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });

    // Restore inventory if applicable
    if (order.inventoryItemId) {
      await this.prisma.inventoryItem.update({
        where: { id: order.inventoryItemId },
        data: {
          stockQuantity: { increment: 1 },
          status: 'AVAILABLE',
        },
      });
    }

    // Notify shop
    await this.notificationsService.create({
      userId: order.shop.userId,
      type: 'SYSTEM_ALERT',
      titleKey: 'notification.order.cancelled.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.order.cancelled.body',
      bodyParams: {
        orderNumber: order.orderNumber,
        reason: reason,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return updatedOrder;
  }

  // Get order statistics for shop
  async getOrderStats(shopId: string) {
    const [
      pendingOrders,
      activeOrders,
      completedOrders,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { shopId, status: { in: ['CREATED', 'PAYMENT_PENDING'] } },
      }),
      this.prisma.order.count({
        where: {
          shopId,
          status: {
            in: [
              'PAID',
              'IN_PRODUCTION',
              'QC_PENDING',
              'QC_PASSED',
              'READY_TO_SHIP',
              'SHIPPED',
              'OUT_FOR_DELIVERY',
            ],
          },
        },
      }),
      this.prisma.order.count({
        where: { shopId, status: 'COMPLETED' },
      }),
      this.prisma.order.aggregate({
        where: { shopId, status: 'COMPLETED' },
        _sum: { totalNpr: true },
      }),
    ]);

    return {
      pendingOrders,
      activeOrders,
      completedOrders,
      totalRevenue: totalRevenue._sum?.totalNpr || 0,
    };
  }

  // ══════════════════════════════════════
  // ADMIN METHODS
  // ══════════════════════════════════════

  // Get all orders (Admin)
  async findAllOrders(filters: AdminOrderFilterDto) {
    const { page = 1, limit = 20, status, paymentStatus, type, shopId, customerId, search, createdByAdmin } = filters;

    const where: any = {};

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (type) where.orderType = type;
    if (shopId) where.shopId = shopId;
    if (customerId) where.customerId = customerId;
    if (createdByAdmin !== undefined) where.createdByAdmin = createdByAdmin;

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { shop: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          shop: { select: { id: true, shopName: true } },
          commissionLedger: { select: { id: true, amount: true, status: true, dueAt: true, paidAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    // Calculate commission breakdown for each order
    const ordersWithCommission = orders.map(order => {
      const commission = order.commissionLedger;
      const shopkeeperAmount = order.totalNpr ? order.totalNpr * 0.99 : 0; // 99% to shopkeeper
      const platformAmount = order.totalNpr ? order.totalNpr * 0.01 : 0; // 1% to platform
      
      return {
        ...order,
        commissionBreakdown: {
          shopkeeperAmount: Math.round(shopkeeperAmount * 100) / 100,
          platformCommission: Math.round(platformAmount * 100) / 100,
          commissionRate: 0.01, // 1%
          commissionStatus: commission?.status || 'NOT_CREATED',
          commissionDueAt: commission?.dueAt || null,
          commissionPaidAt: commission?.paidAt || null,
        },
      };
    });

    return {
      orders: ordersWithCommission,
      meta: {
        page,
        limit,
        totalCount: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get platform-wide order statistics (Admin)
  async getPlatformStats() {
    const [
      totalOrders,
      pendingOrders,
      inProductionOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      pendingPayments,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({
        where: { status: { in: ['CREATED', 'PAYMENT_PENDING'] } },
      }),
      this.prisma.order.count({
        where: { status: { in: ['IN_PRODUCTION', 'QC_PENDING', 'QC_PASSED'] } },
      }),
      this.prisma.order.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.order.count({
        where: { status: 'CANCELLED' },
      }),
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalNpr: true },
      }),
      this.prisma.order.aggregate({
        where: { paymentStatus: { in: ['PENDING', 'PARTIAL'] } },
        _sum: { balanceDueNpr: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      inProductionOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: totalRevenue._sum?.totalNpr || 0,
      pendingPayments: pendingPayments._sum?.balanceDueNpr || 0,
    };
  }

  // Cancel order as admin
  async adminCancelOrder(orderId: string, adminId: string, dto: AdminCancelOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        shop: { select: { id: true, userId: true, shopName: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed or already cancelled order');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED' as OrderStatus,
        adminNotes: `[ADMIN CANCELLED] ${dto.reason}${dto.adminNotes ? '\n' + dto.adminNotes : ''}`
      },
    });

    // Notify customer
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'SYSTEM_ALERT',
      titleKey: 'notification.order.admin_cancelled.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.order.admin_cancelled.body',
      bodyParams: {
        orderNumber: order.orderNumber,
        reason: dto.reason,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    // Notify shop
    await this.notificationsService.create({
      userId: order.shop.userId,
      type: 'SYSTEM_ALERT',
      titleKey: 'notification.order.admin_cancelled.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.order.admin_cancelled.shop_body',
      bodyParams: {
        orderNumber: order.orderNumber,
        reason: dto.reason,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return updatedOrder;
  }

  // Update order timeline (Admin)
  async adminUpdateTimeline(orderId: string, adminId: string, dto: AdminUpdateTimelineDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const previousDelivery = order.estimatedDelivery;
    
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        estimatedDelivery: new Date(dto.estimatedDelivery),
        adminNotes: dto.adminNotes ? `${order.adminNotes || ''}\n[TIMELINE UPDATED] ${dto.adminNotes}`.trim() : order.adminNotes,
      },
    });

    // Notify customer of timeline change
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'SYSTEM_ALERT',
      titleKey: 'notification.order.timeline_updated.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.order.timeline_updated.body',
      bodyParams: {
        orderNumber: order.orderNumber,
        newDate: dto.estimatedDelivery,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return updatedOrder;
  }

  // Manually verify payment (Admin)
  async adminVerifyPayment(orderId: string, adminId: string, dto: AdminVerifyPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true } },
        shop: { select: { id: true, userId: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentStatus === 'COMPLETED') {
      throw new BadRequestException('Payment is already marked as completed');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'COMPLETED',
        balanceDueNpr: 0,
        paymentVerifiedByAdmin: true,
        paymentVerifiedAt: new Date(),
        paymentVerifiedById: adminId,
        adminNotes: `${order.adminNotes || ''}\n[PAYMENT VERIFIED BY ADMIN] ${dto.verificationNotes}`.trim(),
        status: order.status === 'CREATED' ? 'PAID' as OrderStatus : order.status,
      },
    });

    // Notify customer
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'SYSTEM_ALERT',
      titleKey: 'notification.payment.verified.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.payment.verified.body',
      bodyParams: {
        orderNumber: order.orderNumber,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    // Notify shop
    await this.notificationsService.create({
      userId: order.shop.userId,
      type: 'SYSTEM_ALERT',
      titleKey: 'notification.payment.verified.shop_title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.payment.verified.shop_body',
      bodyParams: {
        orderNumber: order.orderNumber,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return updatedOrder;
  }

  // ══════════════════════════════════════
  // COUNTER-OFFER METHODS
  // ══════════════════════════════════════
  // COUNTER-OFFER METHODS
  // NOTE: These methods require running `npx prisma migrate dev` to create OrderVersion table
  // ══════════════════════════════════════

  // Create counter-offer for custom order
  async createCounterOffer(orderId: string, shopkeeperId: string, dto: CreateCounterOfferDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: { select: { id: true, userId: true, shopName: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.shop.userId !== shopkeeperId) {
      throw new ForbiddenException('Not authorized to modify this order');
    }

    if (order.orderType !== 'CUSTOM') {
      throw new BadRequestException('Counter-offers are only available for custom orders');
    }

    // Get next version number
    const existingVersions = await this.prisma.orderVersion.count({
      where: { orderId },
    });
    const nextVersionNumber = existingVersions + 1;

    // Extract values from DTO
    const estimatedDeliveryDays = dto.timeline?.estimatedDays || 14;
    const totalPrice = dto.pricing?.totalNpr || 0;
    const makingCharges = dto.pricing?.makingChargesNpr || 0;
    const subtotal = dto.pricing?.subtotalNpr || totalPrice;
    const tax = dto.pricing?.taxNpr || 0;

    // Create new version
    const newVersion = await this.prisma.orderVersion.create({
      data: {
        orderId,
        versionNumber: nextVersionNumber,
        status: 'PENDING',
        createdByRole: 'SHOPKEEPER',
        createdById: shopkeeperId,
        productSnapshot: {},
        materials: dto.materials || undefined,
        gemstones: dto.gemstones || undefined,
        finishes: dto.finishes || undefined,
        timeline: { estimatedDays: estimatedDeliveryDays },
        subtotalNpr: subtotal,
        taxNpr: tax,
        shippingNpr: 0,
        discountNpr: 0,
        totalNpr: totalPrice,
        makingChargesNpr: makingCharges,
        changeSummary: dto.changeSummary,
      },
    });

    // Notify customer of counter-offer
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'SYSTEM_ALERT',
      titleKey: 'notification.order.counter_offer.title',
      titleParams: { shopName: order.shop.shopName },
      bodyKey: 'notification.order.counter_offer.body',
      bodyParams: {
        orderNumber: order.orderNumber,
        newPrice: totalPrice,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return newVersion;
  }

  // Get all versions/counter-offers for an order
  async getOrderVersions(orderId: string, userId: string, userRole: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: { select: { userId: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access
    const hasAccess =
      userRole === 'ADMIN' ||
      order.customerId === userId ||
      order.shop.userId === userId;

    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to view this order');
    }

    const versions = await this.prisma.orderVersion.findMany({
      where: { orderId },
      orderBy: { versionNumber: 'desc' },
    });
    
    return versions;
  }

  // Respond to counter-offer
  async respondToCounterOffer(
    orderId: string,
    versionId: string,
    customerId: string,
    dto: RespondToCounterOfferDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: { select: { id: true, userId: true, shopName: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customerId) {
      throw new ForbiddenException('Not authorized to respond to this counter-offer');
    }

    const version = await this.prisma.orderVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.orderId !== orderId) {
      throw new NotFoundException('Counter-offer not found');
    }

    if (version.status !== 'PENDING') {
      throw new BadRequestException('This counter-offer is no longer pending');
    }

    const isAccept = dto.response === 'ACCEPT';
    
    // Parse timeline from Json field
    const timelineData = version.timeline as { estimatedDays?: number } | null;
    const estimatedDays = timelineData?.estimatedDays || 14;
    
    if (isAccept) {
      // Accept the counter-offer - update order with new values
      await this.prisma.$transaction(async (tx) => {
        // Update version status
        await tx.orderVersion.update({
          where: { id: versionId },
          data: { 
            status: 'ACCEPTED',
            customerResponse: 'ACCEPTED',
            respondedAt: new Date(),
          },
        });

        // Update order with accepted version values
        await tx.order.update({
          where: { id: orderId },
          data: {
            currentVersionId: versionId,
            totalNpr: version.totalNpr,
            estimatedDelivery: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000),
            status: 'PAID', // Move to PAID status to proceed with order
          },
        });

        // Mark other pending versions as superseded
        await tx.orderVersion.updateMany({
          where: {
            orderId,
            id: { not: versionId },
            status: 'PENDING',
          },
          data: { status: 'SUPERSEDED' },
        });
      });

      // Notify shopkeeper
      await this.notificationsService.create({
        userId: order.shop.userId,
        type: 'SYSTEM_ALERT',
        titleKey: 'notification.order.counter_offer_accepted.title',
        titleParams: { orderNumber: order.orderNumber },
        bodyKey: 'notification.order.counter_offer_accepted.body',
        bodyParams: { orderNumber: order.orderNumber },
        referenceType: 'ORDER',
        referenceId: order.id,
        channels: ['EMAIL', 'PUSH'],
      });

      return { status: 'accepted', versionId };
    } else {
      // Reject the counter-offer
      await this.prisma.orderVersion.update({
        where: { id: versionId },
        data: {
          status: 'REJECTED',
          customerResponse: 'REJECTED',
          customerNotes: dto.notes,
          respondedAt: new Date(),
        },
      });

      // Notify shopkeeper
      await this.notificationsService.create({
        userId: order.shop.userId,
        type: 'SYSTEM_ALERT',
        titleKey: 'notification.order.counter_offer_rejected.title',
        titleParams: { orderNumber: order.orderNumber },
        bodyKey: 'notification.order.counter_offer_rejected.body',
        bodyParams: {
          orderNumber: order.orderNumber,
          reason: dto.notes || 'No reason provided',
        },
        referenceType: 'ORDER',
        referenceId: order.id,
        channels: ['EMAIL', 'PUSH'],
      });

      return { status: 'rejected', versionId };
    }
  }

  // ══════════════════════════════════════
  // ADMIN ORDER/PAYMENT STATUS CONTROLS
  // ══════════════════════════════════════

  async adminUpdateOrderStatus(orderId: string, adminId: string, dto: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, shop: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        detailedStatus: dto.detailedStatus,
        adminNotes: dto.adminNotes || order.adminNotes,
        updatedAt: new Date(),
      },
    });

    // Notify customer of status change
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'ORDER_UPDATE',
      titleKey: 'notification.order.status_updated.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.order.status_updated.body',
      bodyParams: { 
        orderNumber: order.orderNumber,
        status: dto.detailedStatus,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return updated;
  }

  async adminUpdatePaymentStatus(orderId: string, adminId: string, dto: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, shop: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate: PAID status requires a payment method
    if (dto.paymentStatus === 'PAID' && !dto.paymentMethod) {
      throw new BadRequestException('Payment method is required when marking as PAID');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatusEnum: dto.paymentStatus,
        paymentMethodEnum: dto.paymentMethod || null,
        paymentStatus: dto.paymentStatus === 'PAID' ? 'COMPLETED' : 
                       dto.paymentStatus === 'PARTIAL' ? 'PARTIAL' : 'PENDING',
        adminNotes: dto.adminNotes || order.adminNotes,
        paymentVerifiedByAdmin: dto.paymentStatus === 'PAID',
        paymentVerifiedAt: dto.paymentStatus === 'PAID' ? new Date() : null,
        paymentVerifiedById: dto.paymentStatus === 'PAID' ? adminId : null,
        updatedAt: new Date(),
      },
    });

    return updated;
  }

  // ══════════════════════════════════════
  // SHOPKEEPER ORDER CONTROLS
  // ══════════════════════════════════════

  async shopkeeperUpdateOrderStatus(orderId: string, shopkeeperId: string, dto: any) {
    // First verify the shopkeeper owns this order
    const user = await this.prisma.user.findUnique({
      where: { id: shopkeeperId },
      include: { shops: true },
    });

    const activeShop = user?.shops?.[0];
    if (!activeShop) {
      throw new ForbiddenException('You do not have a shop');
    }

    // Check if shop is on hold
    if (activeShop.isOnHold) {
      throw new ForbiddenException(
        'Your shop is on hold due to unpaid commissions. Please settle outstanding commissions to continue.',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.shopId !== activeShop.id) {
      throw new ForbiddenException('This order does not belong to your shop');
    }

    // Shopkeepers can only set certain statuses
    const allowedStatuses = ['CONFIRMED', 'IN_PROGRESS', 'READY', 'SHIPPED', 'DELIVERED'];
    if (!allowedStatuses.includes(dto.detailedStatus)) {
      throw new BadRequestException(
        `Shopkeepers can only set these statuses: ${allowedStatuses.join(', ')}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        detailedStatus: dto.detailedStatus,
        updatedAt: new Date(),
      },
    });

    // Notify customer of status change
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'ORDER_UPDATE',
      titleKey: 'notification.order.status_updated.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.order.status_updated.body',
      bodyParams: { 
        orderNumber: order.orderNumber,
        status: dto.detailedStatus,
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return updated;
  }

  async markPaidAtShop(orderId: string, shopkeeperId: string, dto: any) {
    // First verify the shopkeeper owns this order
    const user = await this.prisma.user.findUnique({
      where: { id: shopkeeperId },
      include: { shops: true },
    });

    const activeShop = user?.shops?.[0];
    if (!activeShop) {
      throw new ForbiddenException('You do not have a shop');
    }

    // Check if shop is on hold
    if (activeShop.isOnHold) {
      throw new ForbiddenException(
        'Your shop is on hold due to unpaid commissions. Please settle outstanding commissions to continue.',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.shopId !== activeShop.id) {
      throw new ForbiddenException('This order does not belong to your shop');
    }

    // Update order with paid at shop status
    const updated = await this.prisma.$transaction(async (tx) => {
      // Update order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paidAtShopRequested: true,
          paidAtShopRequestedAt: new Date(),
          paymentStatusEnum: 'PAID_ON_SHOP',
          paymentStatus: 'COMPLETED',
          paymentMethodEnum: 'PAID_AT_SHOP',
          balanceDueNpr: 0,
          updatedAt: new Date(),
        },
      });

      // Calculate and create commission ledger
      const commissionRate = 0.01; // 1%
      const commissionAmount = order.totalNpr * commissionRate;
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 21); // 21 days to settle

      await tx.commissionLedger.upsert({
        where: { orderId },
        create: {
          orderId,
          shopId: activeShop.id,
          orderTotal: order.totalNpr,
          commissionRate,
          amount: commissionAmount,
          currency: order.displayCurrency || 'NPR',
          status: 'PENDING',
          dueAt,
          notes: dto.notes,
        },
        update: {
          orderTotal: order.totalNpr,
          amount: commissionAmount,
          status: 'PENDING',
          dueAt,
          notes: dto.notes,
          updatedAt: new Date(),
        },
      });

      return updatedOrder;
    });

    return {
      order: updated,
      commission: {
        amount: order.totalNpr * 0.01,
        dueInDays: 21,
        message: 'Commission of 1% is due within 21 days',
      },
    };
  }
}

