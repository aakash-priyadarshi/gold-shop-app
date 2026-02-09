import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PlatformConfigService } from "../platform-config/platform-config.service";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { CustomerCounterOfferDto } from "./dto/customer-counter-offer.dto";

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
    private platformConfig: PlatformConfigService,
  ) {}

  async create(shopId: string, dto: CreateOfferDto) {
    // Verify shop is targeted for this RFQ
    const target = await this.prisma.rfqShopTarget.findFirst({
      where: {
        rfqId: dto.rfqId,
        shopId,
      },
      include: {
        rfq: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!target) {
      throw new ForbiddenException("Shop is not targeted for this RFQ");
    }

    if (
      target.rfq.status !== "SENT_TO_SHOPS" &&
      target.rfq.status !== "OFFERS_RECEIVED"
    ) {
      throw new BadRequestException("RFQ is not accepting offers");
    }

    // Enforce making charge cap based on seller tier
    if (
      dto.offerType !== "DECLINE" &&
      dto.makingChargeNpr &&
      dto.metalCostNpr
    ) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { makingChargeCap: true, sellerTier: true },
      });
      if (shop && dto.metalCostNpr > 0) {
        const makingChargePct = (dto.makingChargeNpr / dto.metalCostNpr) * 100;
        const cap =
          shop.makingChargeCap ??
          (await this.platformConfig.getMakingChargeCap(shop.sellerTier));
        if (makingChargePct > cap) {
          throw new BadRequestException(
            `Making charge (${makingChargePct.toFixed(1)}%) exceeds your tier cap of ${cap}%. ` +
              `Upgrade your seller tier to unlock higher making charges.`,
          );
        }
      }
    }

    // Calculate total price
    const totalPriceNpr =
      (dto.metalCostNpr || 0) +
      (dto.makingChargeNpr || 0) +
      (dto.finishCostNpr || 0) +
      (dto.gemstoneCostNpr || 0) +
      (dto.taxNpr || 0);

    // Calculate booking fee
    const bookingFeePercent = dto.bookingFeePercent || 20;
    const bookingFeeNpr = Math.round((totalPriceNpr * bookingFeePercent) / 100);

    const offer = await this.prisma.rfqOffer.create({
      data: {
        rfqId: dto.rfqId,
        shopId,
        offerType: dto.offerType,
        declineReason: dto.declineReason,
        confirmedComposition: JSON.parse(
          JSON.stringify(dto.confirmedComposition || target.rfq.composition),
        ),
        confirmedTotalWeightG: dto.confirmedTotalWeightG,
        confirmedGoldWeightG: dto.confirmedGoldWeightG,
        metalCostNpr: dto.metalCostNpr || 0,
        makingChargeNpr: dto.makingChargeNpr || 0,
        finishCostNpr: dto.finishCostNpr || 0,
        gemstoneCostNpr: dto.gemstoneCostNpr || 0,
        taxNpr: dto.taxNpr || 0,
        totalPriceNpr,
        estimatedDays: dto.estimatedDays || 14,
        bookingFeeNpr,
        bookingFeePercent,
        shopNotes: dto.shopNotes,
        status: dto.offerType === "DECLINE" ? "DECLINED" : "PENDING",
      },
      include: {
        shop: {
          select: {
            shopName: true,
            userId: true,
          },
        },
      },
    });

    // Update target as responded
    await this.prisma.rfqShopTarget.update({
      where: { id: target.id },
      data: { respondedAt: new Date() },
    });

    // Update RFQ status if first offer
    if (target.rfq.status === "SENT_TO_SHOPS") {
      await this.prisma.rfqRequest.update({
        where: { id: dto.rfqId },
        data: { status: "OFFERS_RECEIVED" },
      });
    }

    // Notify customer (only if not a walk-in RFQ)
    if (target.rfq.customerId) {
      await this.notificationsService.create({
        userId: target.rfq.customerId,
        type: dto.offerType === "DECLINE" ? "OFFER_RECEIVED" : "OFFER_RECEIVED",
        titleKey: "notification.offerReceived.title",
        bodyKey: "notification.offerReceived.body",
        bodyParams: {
          shopName: offer.shop.shopName,
          offerType: dto.offerType,
        },
        referenceType: "OFFER",
        referenceId: offer.id,
        channels: ["EMAIL", "PUSH"],
      });
    }

    await this.auditService.log({
      userId: offer.shop.userId,
      actorType: "USER",
      action: "CREATE",
      resourceType: "OFFER",
      resourceId: offer.id,
      newValue: {
        rfqId: dto.rfqId,
        offerType: dto.offerType,
        totalPriceNpr,
      },
    });

    return {
      ...offer,
      message: `Offer ${dto.offerType.toLowerCase()} sent to customer`,
      messageKey: "helper.offerSent",
    };
  }

  async createCounterOffer(
    offerId: string,
    shopId: string,
    dto: CreateOfferDto,
  ) {
    const originalOffer = await this.prisma.rfqOffer.findUnique({
      where: { id: offerId },
      include: {
        rfq: {
          include: {
            customer: true,
          },
        },
        parentOffer: true,
      },
    });

    if (!originalOffer) {
      throw new NotFoundException("Original offer not found");
    }

    // For CUSTOMER_COUNTER offers, the shop can counter if they were the original shop
    // For regular shop offers, the shop can counter their own offers
    const isCustomerCounter = originalOffer.offerType === "CUSTOMER_COUNTER";

    if (isCustomerCounter) {
      // For customer counters, check if this shop's offer was countered
      if (originalOffer.shopId !== shopId) {
        throw new ForbiddenException(
          "Cannot counter a customer offer for a different shop",
        );
      }
    } else {
      // For regular offers, only the shop that made the offer can counter
      if (originalOffer.shopId !== shopId) {
        throw new ForbiddenException("Cannot counter someone else's offer");
      }
    }

    // Calculate total price
    const totalPriceNpr =
      (dto.metalCostNpr || 0) +
      (dto.makingChargeNpr || 0) +
      (dto.finishCostNpr || 0) +
      (dto.gemstoneCostNpr || 0) +
      (dto.taxNpr || 0);

    const bookingFeePercent = dto.bookingFeePercent || 20;
    const bookingFeeNpr = Math.round((totalPriceNpr * bookingFeePercent) / 100);

    const counterOffer = await this.prisma.rfqOffer.create({
      data: {
        rfqId: originalOffer.rfqId,
        shopId,
        offerType: "COUNTER",
        parentOfferId: offerId,
        confirmedComposition: JSON.parse(
          JSON.stringify(
            dto.confirmedComposition || originalOffer.confirmedComposition,
          ),
        ),
        confirmedTotalWeightG: dto.confirmedTotalWeightG,
        confirmedGoldWeightG: dto.confirmedGoldWeightG,
        metalCostNpr: dto.metalCostNpr || 0,
        makingChargeNpr: dto.makingChargeNpr || 0,
        finishCostNpr: dto.finishCostNpr || 0,
        gemstoneCostNpr: dto.gemstoneCostNpr || 0,
        taxNpr: dto.taxNpr || 0,
        totalPriceNpr,
        estimatedDays: dto.estimatedDays || 14,
        bookingFeeNpr,
        bookingFeePercent,
        shopNotes: dto.shopNotes,
        status: "COUNTERED",
      },
    });

    // Update original offer status
    await this.prisma.rfqOffer.update({
      where: { id: offerId },
      data: { status: "COUNTERED" },
    });

    // Notify customer (only if not a walk-in RFQ)
    if (originalOffer.rfq.customerId) {
      await this.notificationsService.create({
        userId: originalOffer.rfq.customerId,
        type: "OFFER_COUNTERED",
        titleKey: "notification.offerCountered.title",
        bodyKey: "notification.offerCountered.body",
        referenceType: "OFFER",
        referenceId: counterOffer.id,
        channels: ["EMAIL", "PUSH"],
      });
    }

    return counterOffer;
  }

  async findByRfq(rfqId: string) {
    return this.prisma.rfqOffer.findMany({
      where: { rfqId },
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            shopNameNe: true,
            shopNameHi: true,
            city: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(offerId: string) {
    const offer = await this.prisma.rfqOffer.findUnique({
      where: { id: offerId },
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            shopNameNe: true,
            shopNameHi: true,
            city: true,
            isVerified: true,
            contactPhone: true,
          },
        },
        rfq: {
          select: {
            customerId: true,
            jewelleryType: true,
            buildMethod: true,
          },
        },
        counterOffers: true,
      },
    });

    if (!offer) {
      throw new NotFoundException("Offer not found");
    }

    return offer;
  }

  async withdraw(offerId: string, shopId: string) {
    const offer = await this.prisma.rfqOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException("Offer not found");
    }

    if (offer.shopId !== shopId) {
      throw new ForbiddenException("Cannot withdraw someone else's offer");
    }

    if (offer.status === "SELECTED") {
      throw new BadRequestException("Cannot withdraw a selected offer");
    }

    return this.prisma.rfqOffer.update({
      where: { id: offerId },
      data: { status: "WITHDRAWN" },
    });
  }

  /**
   * Customer creates a counter-offer to a shop's offer
   */
  async customerCounter(
    offerId: string,
    customerId: string,
    dto: CustomerCounterOfferDto,
  ) {
    const originalOffer = await this.prisma.rfqOffer.findUnique({
      where: { id: offerId },
      include: {
        rfq: true,
        shop: {
          select: {
            shopName: true,
            userId: true,
          },
        },
      },
    });

    if (!originalOffer) {
      throw new NotFoundException("Offer not found");
    }

    // Verify customer owns this RFQ
    if (originalOffer.rfq.customerId !== customerId) {
      throw new ForbiddenException(
        "You can only counter-offer on your own RFQs",
      );
    }

    // Can only counter PENDING offers from shop
    if (originalOffer.status !== "PENDING") {
      throw new BadRequestException(
        `Cannot counter an offer with status ${originalOffer.status}`,
      );
    }

    // Create customer counter-offer
    // We store it as a new RfqOffer with parentOfferId
    // offerType: 'CUSTOMER_COUNTER' to distinguish from shop counters
    const counterOffer = await this.prisma.rfqOffer.create({
      data: {
        rfqId: originalOffer.rfqId,
        shopId: originalOffer.shopId,
        offerType: "CUSTOMER_COUNTER",
        parentOfferId: offerId,
        confirmedComposition: originalOffer.confirmedComposition as object,
        confirmedTotalWeightG: originalOffer.confirmedTotalWeightG,
        confirmedGoldWeightG: originalOffer.confirmedGoldWeightG,
        metalCostNpr: originalOffer.metalCostNpr,
        makingChargeNpr: originalOffer.makingChargeNpr,
        finishCostNpr: originalOffer.finishCostNpr,
        gemstoneCostNpr: originalOffer.gemstoneCostNpr,
        taxNpr: originalOffer.taxNpr,
        totalPriceNpr: dto.proposedPriceNpr,
        estimatedDays: dto.preferredDeliveryDays || originalOffer.estimatedDays,
        bookingFeeNpr: Math.round(
          (dto.proposedPriceNpr * originalOffer.bookingFeePercent) / 100,
        ),
        bookingFeePercent: originalOffer.bookingFeePercent,
        shopNotes: dto.message,
        status: "PENDING", // Waiting for shop to accept/counter
      },
    });

    // Update original offer status
    await this.prisma.rfqOffer.update({
      where: { id: offerId },
      data: { status: "COUNTERED" },
    });

    // Notify shop owner
    await this.notificationsService.create({
      userId: originalOffer.shop.userId,
      type: "CUSTOMER_COUNTER_OFFER",
      titleKey: "notification.customerCounterOffer.title",
      bodyKey: "notification.customerCounterOffer.body",
      bodyParams: {
        proposedPrice: dto.proposedPriceNpr,
        originalPrice: originalOffer.totalPriceNpr,
      },
      referenceType: "OFFER",
      referenceId: counterOffer.id,
      channels: ["EMAIL", "PUSH"],
    });

    await this.auditService.log({
      userId: customerId,
      actorType: "USER",
      action: "CREATE",
      resourceType: "OFFER",
      resourceId: counterOffer.id,
      newValue: {
        type: "CUSTOMER_COUNTER",
        proposedPrice: dto.proposedPriceNpr,
        parentOfferId: offerId,
      },
    });

    return {
      ...counterOffer,
      message: "Counter-offer sent to shop",
      messageKey: "helper.counterOfferSent",
    };
  }

  /**
   * Accept an offer
   * - Customer accepts shop's offer → creates order
   * - Shop accepts customer's counter-offer → creates order
   */
  async acceptOffer(
    offerId: string,
    userId: string,
    role: UserRole,
    shopId: string | null,
  ) {
    const offer = await this.prisma.rfqOffer.findUnique({
      where: { id: offerId },
      include: {
        rfq: {
          include: {
            customer: true,
          },
        },
        shop: {
          select: {
            id: true,
            shopName: true,
            userId: true,
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException("Offer not found");
    }

    if (offer.status !== "PENDING") {
      throw new BadRequestException(
        `Cannot accept offer with status ${offer.status}`,
      );
    }

    // Determine who can accept based on offer type
    const isCustomerCounterOffer = offer.offerType === "CUSTOMER_COUNTER";

    if (isCustomerCounterOffer) {
      // Shop needs to accept customer's counter-offer
      if (role !== "SHOPKEEPER" || offer.shopId !== shopId) {
        throw new ForbiddenException(
          "Only the shop can accept this counter-offer",
        );
      }
    } else {
      // Customer needs to accept shop's offer
      if (role !== "CUSTOMER" || offer.rfq.customerId !== userId) {
        throw new ForbiddenException("Only the customer can accept this offer");
      }
    }

    // Update offer status
    await this.prisma.rfqOffer.update({
      where: { id: offerId },
      data: { status: "ACCEPTED" },
    });

    // Update RFQ status and select this offer
    await this.prisma.rfqRequest.update({
      where: { id: offer.rfqId },
      data: {
        status: "OFFER_SELECTED",
        selectedOfferId: offerId,
      },
    });

    // Create order
    const order = await this.prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
        orderType: "CUSTOM",
        customerId: offer.rfq.customerId!,
        shopId: offer.shopId,
        rfqOfferId: offerId,
        productSnapshot: (offer.confirmedComposition as object) || {},
        subtotalNpr: offer.totalPriceNpr,
        taxNpr: offer.taxNpr,
        totalNpr: offer.totalPriceNpr,
        paymentStatus: "PENDING",
        bookingFeePaidNpr: 0,
        balanceDueNpr: offer.totalPriceNpr,
        shippingAddress: {},
        status: "PAYMENT_PENDING",
        estimatedDelivery: new Date(
          Date.now() + offer.estimatedDays * 24 * 60 * 60 * 1000,
        ),
      },
    });

    // Notify both parties
    if (isCustomerCounterOffer) {
      // Notify customer that shop accepted their counter
      await this.notificationsService.create({
        userId: offer.rfq.customerId!,
        type: "COUNTER_ACCEPTED",
        titleKey: "notification.counterAccepted.title",
        bodyKey: "notification.counterAccepted.body",
        bodyParams: {
          shopName: offer.shop.shopName,
          price: offer.totalPriceNpr,
        },
        referenceType: "ORDER",
        referenceId: order.id,
        channels: ["EMAIL", "PUSH"],
      });
    } else {
      // Notify shop that customer accepted their offer
      await this.notificationsService.create({
        userId: offer.shop.userId,
        type: "OFFER_ACCEPTED",
        titleKey: "notification.offerAccepted.title",
        bodyKey: "notification.offerAccepted.body",
        bodyParams: {
          orderNumber: order.orderNumber,
        },
        referenceType: "ORDER",
        referenceId: order.id,
        channels: ["EMAIL", "PUSH"],
      });
    }

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "OFFER",
      resourceId: offerId,
      newValue: {
        status: "ACCEPTED",
        orderId: order.id,
      },
    });

    return {
      offer: { ...offer, status: "ACCEPTED" },
      order,
      message: "Offer accepted! Order created.",
      messageKey: "helper.offerAccepted",
    };
  }

  /**
   * Decline an offer
   */
  async declineOffer(
    offerId: string,
    userId: string,
    role: UserRole,
    shopId: string | null,
    reason?: string,
  ) {
    const offer = await this.prisma.rfqOffer.findUnique({
      where: { id: offerId },
      include: {
        rfq: true,
        shop: {
          select: {
            shopName: true,
            userId: true,
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException("Offer not found");
    }

    if (offer.status !== "PENDING") {
      throw new BadRequestException(
        `Cannot decline offer with status ${offer.status}`,
      );
    }

    const isCustomerCounterOffer = offer.offerType === "CUSTOMER_COUNTER";

    if (isCustomerCounterOffer) {
      // Shop declining customer's counter-offer
      if (role !== "SHOPKEEPER" || offer.shopId !== shopId) {
        throw new ForbiddenException(
          "Only the shop can decline this counter-offer",
        );
      }
    } else {
      // Customer declining shop's offer
      if (role !== "CUSTOMER" || offer.rfq.customerId !== userId) {
        throw new ForbiddenException(
          "Only the customer can decline this offer",
        );
      }
    }

    await this.prisma.rfqOffer.update({
      where: { id: offerId },
      data: {
        status: "DECLINED",
        declineReason: reason,
      },
    });

    // Notify the other party
    if (isCustomerCounterOffer) {
      // Notify customer that shop declined their counter
      await this.notificationsService.create({
        userId: offer.rfq.customerId!,
        type: "COUNTER_DECLINED",
        titleKey: "notification.counterDeclined.title",
        bodyKey: "notification.counterDeclined.body",
        bodyParams: {
          shopName: offer.shop.shopName,
          reason: reason || "No reason provided",
        },
        referenceType: "OFFER",
        referenceId: offerId,
        channels: ["EMAIL", "PUSH"],
      });
    } else {
      // Notify shop that customer declined their offer
      await this.notificationsService.create({
        userId: offer.shop.userId,
        type: "OFFER_DECLINED",
        titleKey: "notification.offerDeclined.title",
        bodyKey: "notification.offerDeclined.body",
        bodyParams: {
          reason: reason || "No reason provided",
        },
        referenceType: "OFFER",
        referenceId: offerId,
        channels: ["EMAIL", "PUSH"],
      });
    }

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "OFFER",
      resourceId: offerId,
      newValue: {
        status: "DECLINED",
        reason,
      },
    });

    return {
      offerId,
      status: "DECLINED",
      message: "Offer declined",
      messageKey: "helper.offerDeclined",
    };
  }
}
