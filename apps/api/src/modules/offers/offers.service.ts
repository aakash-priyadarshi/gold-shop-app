import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { CreateOfferDto } from './dto/create-offer.dto';

@Injectable()
export class OffersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
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
      throw new ForbiddenException('Shop is not targeted for this RFQ');
    }

    if (target.rfq.status !== 'SENT_TO_SHOPS' && target.rfq.status !== 'OFFERS_RECEIVED') {
      throw new BadRequestException('RFQ is not accepting offers');
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
        confirmedComposition: JSON.parse(JSON.stringify(dto.confirmedComposition || target.rfq.composition)),
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
        status: dto.offerType === 'DECLINE' ? 'DECLINED' : 'PENDING',
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
    if (target.rfq.status === 'SENT_TO_SHOPS') {
      await this.prisma.rfqRequest.update({
        where: { id: dto.rfqId },
        data: { status: 'OFFERS_RECEIVED' },
      });
    }

    // Notify customer
    await this.notificationsService.create({
      userId: target.rfq.customerId,
      type: dto.offerType === 'DECLINE' ? 'OFFER_RECEIVED' : 'OFFER_RECEIVED',
      titleKey: 'notification.offerReceived.title',
      bodyKey: 'notification.offerReceived.body',
      bodyParams: {
        shopName: offer.shop.shopName,
        offerType: dto.offerType,
      },
      referenceType: 'OFFER',
      referenceId: offer.id,
      channels: ['EMAIL', 'PUSH'],
    });

    await this.auditService.log({
      userId: offer.shop.userId,
      actorType: 'USER',
      action: 'CREATE',
      resourceType: 'OFFER',
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
      messageKey: 'helper.offerSent',
    };
  }

  async createCounterOffer(offerId: string, shopId: string, dto: CreateOfferDto) {
    const originalOffer = await this.prisma.rfqOffer.findUnique({
      where: { id: offerId },
      include: {
        rfq: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!originalOffer) {
      throw new NotFoundException('Original offer not found');
    }

    if (originalOffer.shopId !== shopId) {
      throw new ForbiddenException('Cannot counter someone else\'s offer');
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
        offerType: 'COUNTER',
        parentOfferId: offerId,
        confirmedComposition: JSON.parse(JSON.stringify(dto.confirmedComposition || originalOffer.confirmedComposition)),
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
        status: 'COUNTERED',
      },
    });

    // Update original offer status
    await this.prisma.rfqOffer.update({
      where: { id: offerId },
      data: { status: 'COUNTERED' },
    });

    // Notify customer
    await this.notificationsService.create({
      userId: originalOffer.rfq.customerId,
      type: 'OFFER_COUNTERED',
      titleKey: 'notification.offerCountered.title',
      bodyKey: 'notification.offerCountered.body',
      referenceType: 'OFFER',
      referenceId: counterOffer.id,
      channels: ['EMAIL', 'PUSH'],
    });

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
      orderBy: { createdAt: 'desc' },
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
      throw new NotFoundException('Offer not found');
    }

    return offer;
  }

  async withdraw(offerId: string, shopId: string) {
    const offer = await this.prisma.rfqOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.shopId !== shopId) {
      throw new ForbiddenException('Cannot withdraw someone else\'s offer');
    }

    if (offer.status === 'SELECTED') {
      throw new BadRequestException('Cannot withdraw a selected offer');
    }

    return this.prisma.rfqOffer.update({
      where: { id: offerId },
      data: { status: 'WITHDRAWN' },
    });
  }
}
