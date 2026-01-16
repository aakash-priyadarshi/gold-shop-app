import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopsService } from '../shops/shops.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { CreateRfqDto } from './dto/create-rfq.dto';
import { CreateWalkInRfqDto } from './dto/create-walkin-rfq.dto';
import { BroadcastRfqDto } from './dto/broadcast-rfq.dto';
import { RfqStatus, BuildMethod, JewelleryType } from '@prisma/client';
import { validateComposition, validateMethodDRequirements, ValidationResult } from './validation/composition-validator';

@Injectable()
export class RfqService {
  constructor(
    private prisma: PrismaService,
    private shopsService: ShopsService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new RFQ (Draft)
   */
  async create(customerId: string, dto: CreateRfqDto) {
    // Validate composition based on build method
    const validationResult = this.validateBuildMethodComposition(dto);
    
    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: 'Invalid composition for selected build method',
        errors: validationResult.errors,
      });
    }

    // Calculate estimated price range
    const priceEstimate = await this.estimatePriceRange(dto);

    const rfq = await this.prisma.rfqRequest.create({
      data: {
        customerId,
        jewelleryType: dto.jewelleryType as JewelleryType,
        buildMethod: dto.buildMethod as BuildMethod,
        composition: JSON.parse(JSON.stringify(dto.composition)),
        targetTotalWeightG: dto.targetTotalWeightG,
        targetGoldWeightG: dto.targetGoldWeightG,
        budgetMinNpr: dto.budgetMinNpr,
        budgetMaxNpr: dto.budgetMaxNpr,
        preferredDeliveryDays: dto.preferredDeliveryDays,
        specialInstructions: dto.specialInstructions,
        referenceImages: dto.referenceImages || [],
        estimatedPriceMinNpr: priceEstimate.min,
        estimatedPriceMaxNpr: priceEstimate.max,
        mandatoryLabels: validationResult.mandatoryLabels,
        status: RfqStatus.DRAFT,
      },
    });

    await this.auditService.log({
      userId: customerId,
      actorType: 'USER',
      action: 'CREATE',
      resourceType: 'RFQ',
      resourceId: rfq.id,
      newValue: { buildMethod: dto.buildMethod, jewelleryType: dto.jewelleryType },
    });

    return rfq;
  }

  /**
   * Create a walk-in RFQ (Shopkeeper creates on behalf of a walk-in customer)
   * This automatically assigns the RFQ to the shopkeeper's shop
   */
  async createWalkIn(shopId: string, shopkeeperId: string, dto: CreateWalkInRfqDto) {
    // Verify shop exists and belongs to the shopkeeper
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId: shopkeeperId },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found or you do not own this shop');
    }

    if (!shop.isVerified) {
      throw new BadRequestException('Shop must be verified to create walk-in RFQs');
    }

    // Validate composition based on build method
    const validationResult = this.validateBuildMethodComposition(dto);
    
    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: 'Invalid composition for selected build method',
        errors: validationResult.errors,
      });
    }

    // Calculate estimated price range
    const priceEstimate = await this.estimatePriceRange(dto);

    // Create the walk-in RFQ - status is SENT_TO_SHOPS since it's already at the shop
    const rfq = await this.prisma.$transaction(async (tx) => {
      const createdRfq = await tx.rfqRequest.create({
        data: {
          // No customerId for walk-in customers
          jewelleryType: dto.jewelleryType as JewelleryType,
          buildMethod: dto.buildMethod as BuildMethod,
          composition: JSON.parse(JSON.stringify(dto.composition)),
          targetTotalWeightG: dto.targetTotalWeightG,
          targetGoldWeightG: dto.targetGoldWeightG,
          budgetMinNpr: dto.budgetMinNpr,
          budgetMaxNpr: dto.budgetMaxNpr,
          preferredDeliveryDays: dto.preferredDeliveryDays,
          specialInstructions: dto.specialInstructions,
          referenceImages: dto.referenceImages || [],
          estimatedPriceMinNpr: priceEstimate.min,
          estimatedPriceMaxNpr: priceEstimate.max,
          mandatoryLabels: validationResult.mandatoryLabels,
          status: RfqStatus.SENT_TO_SHOPS,
          broadcastAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days for walk-in
          // Walk-in customer fields
          isWalkIn: true,
          createdByShopId: shopId,
          walkInCustomerName: dto.customer.name,
          walkInCustomerPhone: dto.customer.phone,
          walkInPhoneCountryCode: dto.customer.phoneCountryCode,
          walkInCustomerEmail: dto.customer.email,
          walkInCustomerAddress: dto.customer.address,
          walkInCustomerCity: dto.customer.city,
          walkInCustomerCountry: dto.customer.country || 'India',
        },
      });

      // Auto-target this shop for the RFQ
      await tx.rfqShopTarget.create({
        data: {
          rfqId: createdRfq.id,
          shopId: shopId,
        },
      });

      return createdRfq;
    });

    await this.auditService.log({
      userId: shopkeeperId,
      actorType: 'USER',
      action: 'CREATE',
      resourceType: 'RFQ',
      resourceId: rfq.id,
      newValue: { 
        buildMethod: dto.buildMethod, 
        jewelleryType: dto.jewelleryType,
        isWalkIn: true,
        customerName: dto.customer.name,
      },
    });

    return {
      ...rfq,
      message: 'Walk-in RFQ created successfully',
    };
  }

  /**
   * Get all walk-in RFQs for a shop
   */
  async findWalkInRfqsForShop(shopId: string, userId: string) {
    // Verify shop belongs to user
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found or you do not own this shop');
    }

    return this.prisma.rfqRequest.findMany({
      where: {
        isWalkIn: true,
        createdByShopId: shopId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        offers: {
          where: { shopId },
          select: {
            id: true,
            status: true,
            totalPriceNpr: true,
          },
        },
      },
    });
  }

  /**
   * Get eligible shops for an RFQ based on capabilities
   * Includes price estimation and city-based priority sorting
   */
  async getEligibleShops(rfqId: string, customerCity?: string) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    // Filter shops by capabilities
    const shops = await this.prisma.shop.findMany({
      where: {
        isActive: true,
        isVerified: true,
        supportedJewelleryTypes: {
          has: rfq.jewelleryType,
        },
        supportedMethods: {
          has: rfq.buildMethod,
        },
      },
      select: {
        id: true,
        shopName: true,
        shopNameNe: true,
        shopNameHi: true,
        city: true,
        country: true,
        isVerified: true,
        makingChargePercent: true,
        codEnabled: true,
        metalRates: true,
        ratings: {
          select: {
            overall: true,
          },
        },
      },
    });

    // Get system default gold rate for fallback
    const systemRate = await this.prisma.marketRate.findFirst({
      where: { metalCode: 'XAU', country: 'NP' },
      orderBy: { validFrom: 'desc' },
    });
    const defaultGoldRatePerGram = systemRate?.ratePerGram || 10000;

    // Calculate price estimate and rating for each shop
    const shopsWithPrices = shops.map((shop) => {
      // Get shop's gold rate or fall back to system rate
      const shopGoldRate = shop.metalRates.find(r => 
        r.metalType === 'GOLD_24K' || r.metalType === 'GOLD_22K'
      );
      const goldRatePerGram = shopGoldRate?.ratePerGramNpr || defaultGoldRatePerGram;
      
      // Estimate price based on target weight
      const targetWeight = rfq.targetGoldWeightG || rfq.targetTotalWeightG || 10;
      const metalCost = targetWeight * goldRatePerGram;
      const makingCharge = metalCost * ((shop.makingChargePercent || 10) / 100);
      const estimatedPrice = Math.round(metalCost + makingCharge);

      // Calculate average rating
      const averageRating = shop.ratings.length > 0
        ? shop.ratings.reduce((sum, r) => sum + r.overall, 0) / shop.ratings.length
        : null;

      // Calculate location priority (1=same city, 2=same country, 3=global)
      let locationPriority = 3;
      if (customerCity && shop.city.toLowerCase() === customerCity.toLowerCase()) {
        locationPriority = 1;
      } else if (shop.country === 'NP') {
        locationPriority = 2;
      }

      return {
        id: shop.id,
        shopName: shop.shopName,
        shopNameNe: shop.shopNameNe,
        shopNameHi: shop.shopNameHi,
        city: shop.city,
        country: shop.country,
        isVerified: shop.isVerified,
        makingChargePercent: shop.makingChargePercent,
        codEnabled: shop.codEnabled,
        averageRating,
        estimatedPrice,
        goldRatePerGram,
        locationPriority,
      };
    });

    // Sort by location priority (city > country > global), then by price
    return shopsWithPrices.sort((a, b) => {
      // First sort by location priority
      if (a.locationPriority !== b.locationPriority) {
        return a.locationPriority - b.locationPriority;
      }
      // Then sort by estimated price (cheapest first)
      return a.estimatedPrice - b.estimatedPrice;
    });
  }

  /**
   * Broadcast RFQ to selected shops
   */
  async broadcast(rfqId: string, customerId: string, dto: BroadcastRfqDto) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    if (rfq.customerId !== customerId) {
      throw new ForbiddenException('Not authorized to broadcast this RFQ');
    }

    if (rfq.status !== RfqStatus.DRAFT) {
      throw new BadRequestException('RFQ has already been broadcast');
    }

    // Validate shops exist and have capabilities
    const eligibleShopIds = (await this.getEligibleShops(rfqId)).map((s) => s.id);
    const invalidShops = dto.shopIds.filter((id) => !eligibleShopIds.includes(id));

    if (invalidShops.length > 0) {
      throw new BadRequestException(
        `Some shops are not eligible for this RFQ: ${invalidShops.join(', ')}`,
      );
    }

    // Create snapshot of RFQ at broadcast time
    const broadcastSnapshot = {
      ...rfq,
      broadcastAt: new Date().toISOString(),
      shopCount: dto.shopIds.length,
    };

    // Update RFQ and create shop targets
    const updatedRfq = await this.prisma.$transaction(async (tx) => {
      // Update RFQ status
      const updated = await tx.rfqRequest.update({
        where: { id: rfqId },
        data: {
          status: RfqStatus.SENT_TO_SHOPS,
          broadcastAt: new Date(),
          broadcastSnapshot,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Create shop targets
      await tx.rfqShopTarget.createMany({
        data: dto.shopIds.map((shopId) => ({
          rfqId,
          shopId,
        })),
      });

      return updated;
    });

    // Send notifications to shops
    for (const shopId of dto.shopIds) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        include: { user: true },
      });

      if (shop) {
        await this.notificationsService.create({
          userId: shop.userId,
          type: 'RFQ_RECEIVED',
          titleKey: 'notification.rfqReceived.title',
          bodyKey: 'notification.rfqReceived.body',
          bodyParams: {
            jewelleryType: rfq.jewelleryType,
            buildMethod: rfq.buildMethod,
          },
          referenceType: 'RFQ',
          referenceId: rfqId,
          channels: ['EMAIL', 'PUSH'],
        });
      }
    }

    await this.auditService.log({
      userId: customerId,
      actorType: 'USER',
      action: 'BROADCAST',
      resourceType: 'RFQ',
      resourceId: rfqId,
      newValue: { shopCount: dto.shopIds.length },
    });

    return {
      ...updatedRfq,
      message: `RFQ sent to ${dto.shopIds.length} shops`,
      messageKey: 'helper.rfqSentToShops',
      messageParams: { count: dto.shopIds.length },
    };
  }

  /**
   * Get RFQ by ID with offers
   */
  async findOne(rfqId: string, userId: string, userRole: string) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        targetedShops: {
          include: {
            rfq: false,
          },
        },
        offers: {
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
          orderBy: {
            createdAt: 'desc',
          },
        },
        selectedOffer: true,
      },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    // Access control
    const isCustomer = rfq.customerId === userId;
    const isShopkeeper = rfq.targetedShops.some(
      (t) => t.shopId === userId, // This would need shop lookup
    );
    const isAdmin = userRole === 'ADMIN';
    const isSupport = userRole === 'SUPPORT';

    if (!isCustomer && !isAdmin && !isSupport) {
      // Check if user is a targeted shopkeeper
      const userShop = await this.prisma.shop.findFirst({
        where: { userId },
      });

      if (!userShop || !rfq.targetedShops.some((t) => t.shopId === userShop.id)) {
        throw new ForbiddenException('Not authorized to view this RFQ');
      }
    }

    return rfq;
  }

  /**
   * List RFQs for a customer
   */
  async findAllForCustomer(customerId: string, status?: RfqStatus) {
    return this.prisma.rfqRequest.findMany({
      where: {
        customerId,
        ...(status && { status }),
      },
      include: {
        offers: {
          select: {
            id: true,
            status: true,
            totalPriceNpr: true,
            shop: {
              select: {
                shopName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * List RFQs for a shopkeeper
   */
  async findAllForShop(shopId: string) {
    return this.prisma.rfqRequest.findMany({
      where: {
        targetedShops: {
          some: {
            shopId,
          },
        },
        status: {
          in: [RfqStatus.SENT_TO_SHOPS, RfqStatus.OFFERS_RECEIVED],
        },
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        offers: {
          where: {
            shopId,
          },
        },
        targetedShops: {
          where: {
            shopId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Validate composition based on build method
   */
  private validateBuildMethodComposition(dto: CreateRfqDto): ValidationResult {
    const composition = dto.composition as any;
    composition.method = dto.buildMethod;

    // Use the shared validation
    const result = validateComposition(composition);

    // Additional METHOD_D validation
    if (dto.buildMethod === 'METHOD_D') {
      if (!validateMethodDRequirements(composition)) {
        result.isValid = false;
        result.errors.push({
          code: 'METHOD_D_REQUIREMENTS_NOT_MET',
          field: 'composition',
          message: 'Method D requires pattern, mode, and at least one weight specification',
          messageKey: 'validation.methodD.requirementsNotMet',
        });
      }
    }

    return result;
  }

  /**
   * Estimate price range based on current market rates
   */
  private async estimatePriceRange(dto: CreateRfqDto): Promise<{ min: number; max: number }> {
    // Get average market rates
    const marketRates = await this.prisma.marketRate.findMany({
      where: {
        country: 'NP', // Default to Nepal
        validUntil: null,
      },
    });

    // Basic estimation logic (simplified)
    let baseRate = 0;
    const composition = dto.composition as any;

    if (dto.buildMethod === 'METHOD_A' || dto.buildMethod === 'METHOD_B') {
      // For solid/alloy methods, use gold rate
      const goldRate = marketRates.find((r) => r.metalCode === 'GOLD_24K');
      baseRate = goldRate?.ratePerGram || 10000; // Default fallback
    } else if (dto.buildMethod === 'METHOD_C') {
      // For plated items, use base metal rate + plating cost
      baseRate = 500; // Base metal average
    } else if (dto.buildMethod === 'METHOD_D') {
      // Multi-metal: weighted calculation
      const goldRate = marketRates.find((r) => r.metalCode === 'GOLD_24K');
      const goldPercent = composition.modeConfig?.goldPercentByWeight || 50;
      baseRate = ((goldRate?.ratePerGram || 10000) * goldPercent) / 100 + 200;
    }

    const weight = dto.targetTotalWeightG || 10; // Default 10g
    const basePrice = baseRate * weight;
    const makingChargeMin = basePrice * 0.08;
    const makingChargeMax = basePrice * 0.20;

    return {
      min: Math.round(basePrice + makingChargeMin),
      max: Math.round(basePrice + makingChargeMax),
    };
  }

  /**
   * Update RFQ status when offers are received
   */
  async updateStatusOnOfferReceived(rfqId: string) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
    });

    if (rfq && rfq.status === RfqStatus.SENT_TO_SHOPS) {
      await this.prisma.rfqRequest.update({
        where: { id: rfqId },
        data: { status: RfqStatus.OFFERS_RECEIVED },
      });
    }
  }

  /**
   * Select an offer
   */
  async selectOffer(rfqId: string, offerId: string, customerId: string) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: rfqId },
      include: { offers: true },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    if (rfq.customerId !== customerId) {
      throw new ForbiddenException('Not authorized');
    }

    if (rfq.status !== RfqStatus.OFFERS_RECEIVED && rfq.status !== RfqStatus.SENT_TO_SHOPS) {
      throw new BadRequestException('Cannot select offer at this stage');
    }

    const offer = rfq.offers.find((o) => o.id === offerId);
    if (!offer) {
      throw new BadRequestException('Offer not found for this RFQ');
    }

    if (offer.status !== 'ACCEPTED' && offer.status !== 'COUNTERED') {
      throw new BadRequestException('Cannot select this offer');
    }

    // Update RFQ and offer
    const result = await this.prisma.$transaction(async (tx) => {
      // Update RFQ
      await tx.rfqRequest.update({
        where: { id: rfqId },
        data: {
          status: RfqStatus.OFFER_SELECTED,
          selectedOfferId: offerId,
        },
      });

      // Update selected offer
      await tx.rfqOffer.update({
        where: { id: offerId },
        data: {
          status: 'SELECTED',
          paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Expire other offers
      await tx.rfqOffer.updateMany({
        where: {
          rfqId,
          id: { not: offerId },
          status: { in: ['PENDING', 'ACCEPTED', 'COUNTERED'] },
        },
        data: { status: 'EXPIRED' },
      });

      return tx.rfqOffer.findUnique({
        where: { id: offerId },
        include: { shop: true },
      });
    });

    // Notify the selected shop
    if (result) {
      await this.notificationsService.create({
        userId: result.shop.userId,
        type: 'OFFER_SELECTED',
        titleKey: 'notification.offerSelected.title',
        bodyKey: 'notification.offerSelected.body',
        referenceType: 'OFFER',
        referenceId: offerId,
        channels: ['EMAIL', 'PUSH', 'SMS'],
      });
    }

    await this.auditService.log({
      userId: customerId,
      actorType: 'USER',
      action: 'SELECT_OFFER',
      resourceType: 'RFQ',
      resourceId: rfqId,
      newValue: { offerId },
    });

    return {
      rfqId,
      offerId,
      message: 'Offer selected. Please pay booking fee within 24 hours.',
      messageKey: 'helper.offerSelected',
      paymentDeadline: result?.paymentDeadline,
      bookingFeeNpr: result?.bookingFeeNpr,
    };
  }
}
