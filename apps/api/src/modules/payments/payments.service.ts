import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CurrencyCode,
  JournalReferenceType,
  MarketRegion,
  PaymentStatus,
  OrderStatus,
} from '@prisma/client';
import { FxRatesService } from '../fx-rates/fx-rates.service';
import { AccountingService } from '../accounting/accounting.service';
import {
  getDefaultCurrencyForMarket,
  normalizeMarketRegion,
} from '../../common/market/country-currency';
import {
  InitiatePaymentDto,
  VerifyPaymentDto,
  InitiateBookingPaymentDto,
  RefundDto,
  PaymentMethod,
  PaymentType,
} from './dto/payment.dto';

// Payment gateway interfaces (to be implemented with actual SDKs)
interface PaymentGatewayOrder {
  orderId: string;
  amount: number;
  currency: string;
  gatewayOrderId: string;
  gatewayKey?: string;
}

interface ChargeQuote {
  amountNpr: number;
  chargedAmount: number;
  chargedCurrency: CurrencyCode;
  fxRate: number;
  fxSource: string;
  fxQuotedAt: Date;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private fxRatesService: FxRatesService,
    private accounting: AccountingService,
  ) {}

  private async quoteCharge(
    amountNpr: number,
    chargedCurrency: CurrencyCode,
  ): Promise<ChargeQuote> {
    if (!Number.isFinite(amountNpr) || amountNpr <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    const conversion = await this.fxRatesService.convertCurrency(
      amountNpr,
      'NPR',
      chargedCurrency as any,
    );
    return {
      amountNpr,
      chargedAmount: conversion.amount,
      chargedCurrency,
      fxRate: conversion.rate,
      fxSource: conversion.source,
      fxQuotedAt: new Date(conversion.quotedAt),
    };
  }

  private resolveGatewayMethod(
    requested: PaymentMethod,
    marketCountry: MarketRegion,
  ): PaymentMethod {
    if (
      marketCountry === MarketRegion.LK &&
      ![PaymentMethod.COD, PaymentMethod.BANK_TRANSFER].includes(requested)
    ) {
      return PaymentMethod.STRIPE;
    }
    return requested;
  }

  private resolveChargeCurrency(
    method: PaymentMethod,
    marketCountry: MarketRegion,
    displayCurrency: CurrencyCode,
  ): CurrencyCode {
    if (method === PaymentMethod.STRIPE) {
      return marketCountry === MarketRegion.LK
        ? CurrencyCode.LKR
        : displayCurrency;
    }
    if (method === PaymentMethod.RAZORPAY) return CurrencyCode.INR;
    return CurrencyCode.NPR;
  }

  // Initiate payment for order
  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { customer: true, shop: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== userId) {
      throw new BadRequestException('You do not own this order');
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        if (existing.orderId !== order.id) {
          throw new BadRequestException(
            'Idempotency key is already associated with another order',
          );
        }
        return {
          paymentId: existing.id,
          orderId: order.id,
          amountNpr: existing.amountNpr,
          amount: existing.chargedAmount ?? existing.amountNpr,
          currency: existing.chargedCurrency ?? CurrencyCode.NPR,
          method: existing.paymentGateway,
          gatewayOrderId: existing.gatewayOrderId,
          idempotentReplay: true,
        };
      }
    }

    // Calculate payment amount based on type
    let amount: number;
    switch (dto.paymentType) {
      case PaymentType.FULL_PAYMENT:
        amount = order.balanceDueNpr;
        break;
      case PaymentType.BALANCE_PAYMENT:
        amount = order.balanceDueNpr;
        break;
      case PaymentType.PARTIAL_PAYMENT:
        if (!dto.amount) {
          throw new BadRequestException('Amount required for partial payment');
        }
        amount = dto.amount;
        break;
      default:
        throw new BadRequestException('Invalid payment type for orders');
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }
    if (amount > order.balanceDueNpr) {
      throw new BadRequestException('Payment amount exceeds the order balance');
    }

    const method = this.resolveGatewayMethod(dto.method, order.marketCountry);
    const chargedCurrency = this.resolveChargeCurrency(
      method,
      order.marketCountry,
      order.displayCurrency,
    );
    const quote = await this.quoteCharge(amount, chargedCurrency);

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amountNpr: amount,
        currency: CurrencyCode.NPR,
        chargedAmount: quote.chargedAmount,
        chargedCurrency: quote.chargedCurrency,
        fxRate: quote.fxRate,
        fxSource: quote.fxSource,
        fxQuotedAt: quote.fxQuotedAt,
        idempotencyKey: dto.idempotencyKey,
        paymentGateway: method,
        status: PaymentStatus.PENDING,
        metadata: {
          orderNumber: order.orderNumber,
          customerEmail: order.customer.email,
          paymentType: dto.paymentType,
          requestedMethod: dto.method,
          amountNpr: amount,
          chargedAmount: quote.chargedAmount,
          chargedCurrency: quote.chargedCurrency,
          fxRate: quote.fxRate,
          fxSource: quote.fxSource,
          fxQuotedAt: quote.fxQuotedAt.toISOString(),
        },
      },
    });
    if (method === PaymentMethod.COD || method === PaymentMethod.BANK_TRANSFER) {
      return {
        paymentId: payment.id,
        orderId: order.id,
        amountNpr: amount,
        amount: quote.chargedAmount,
        currency: quote.chargedCurrency,
        method,
        message:
          method === PaymentMethod.COD
            ? 'Pay on delivery'
            : 'Bank transfer pending verification',
      };
    }

    let gatewayOrder: PaymentGatewayOrder;
    try {
      switch (method) {
        case PaymentMethod.RAZORPAY:
          gatewayOrder = await this.createRazorpayOrder(
            payment.id,
            quote.chargedAmount,
          );
          break;
        case PaymentMethod.STRIPE:
          gatewayOrder = await this.createStripePaymentIntent(
            payment.id,
            quote,
            order.customer.email,
            dto.idempotencyKey,
          );
          break;
        case PaymentMethod.ESEWA:
          gatewayOrder = await this.createEsewaOrder(payment.id, amount);
          break;
        case PaymentMethod.KHALTI:
          gatewayOrder = await this.createKhaltiOrder(payment.id, amount);
          break;
        default:
          throw new BadRequestException('Unsupported payment method');
      }
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failureReason: error.message },
      });
      throw error;
    }

    // Update payment with gateway order ID
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayOrderId: gatewayOrder.gatewayOrderId,
      },
    });

    return {
      paymentId: payment.id,
      orderId: dto.orderId,
      amountNpr: amount,
      amount: quote.chargedAmount,
      currency: quote.chargedCurrency,
      fxRate: quote.fxRate,
      fxSource: quote.fxSource,
      fxQuotedAt: quote.fxQuotedAt,
      method,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      gatewayKey: gatewayOrder.gatewayKey,
    };
  }

  // Initiate booking fee payment for RFQ
  async initiateBookingPayment(userId: string, dto: InitiateBookingPaymentDto) {
    const rfq = await this.prisma.rfqRequest.findUnique({
      where: { id: dto.rfqRequestId },
      include: {
        offers: { where: { id: dto.offerId } },
        customer: true,
      },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    if (rfq.customerId !== userId) {
      throw new BadRequestException('You do not own this RFQ');
    }

    const offer = rfq.offers[0];
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'ACCEPTED') {
      throw new BadRequestException('Please accept the offer first');
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return {
          paymentId: existing.id,
          orderId: existing.orderId,
          rfqRequestId: dto.rfqRequestId,
          offerId: dto.offerId,
          amountNpr: existing.amountNpr,
          amount: existing.chargedAmount ?? existing.amountNpr,
          currency: existing.chargedCurrency ?? CurrencyCode.NPR,
          method: existing.paymentGateway,
          gatewayOrderId: existing.gatewayOrderId,
          idempotentReplay: true,
        };
      }
    }

    const bookingFee = offer.bookingFeeNpr || 0;
    if (bookingFee <= 0) {
      throw new BadRequestException('No booking fee required');
    }

    // Get customer's preferred currency
    const customer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredCurrency: true, preferredCountry: true },
    });
    const marketCountry = normalizeMarketRegion(
      customer?.preferredCountry,
      MarketRegion.NP,
    );
    const displayCurrency =
      marketCountry === MarketRegion.LK
        ? CurrencyCode.LKR
        : customer?.preferredCurrency || getDefaultCurrencyForMarket(marketCountry);
    const method = this.resolveGatewayMethod(dto.method, marketCountry);
    const chargedCurrency = this.resolveChargeCurrency(
      method,
      marketCountry,
      displayCurrency,
    );
    const quote = await this.quoteCharge(bookingFee, chargedCurrency);

    // Create a placeholder order for the booking fee payment
    // Note: In a real scenario, you might want to create the order first
    // For now, we'll create a payment tied to an order that will be created later

    // Create payment record - will need an orderId, so let's create an order first
    const order = await this.prisma.order.create({
      data: {
        orderNumber: `RFQ-${Date.now().toString(36).toUpperCase()}`,
        orderType: 'CUSTOM',
        customerId: userId,
        shopId: offer.shopId,
        rfqOfferId: offer.id,
        productSnapshot: {
          rfqId: rfq.id,
          offerId: offer.id,
          jewelleryType: rfq.jewelleryType,
          buildMethod: rfq.buildMethod,
          composition: offer.confirmedComposition,
        },
        subtotalNpr: offer.totalPriceNpr - offer.taxNpr,
        taxNpr: offer.taxNpr,
        shippingNpr: 0,
        discountNpr: 0,
        totalNpr: offer.totalPriceNpr,
        displayCurrency,
        marketCountry,
        paymentMethod: method,
        paymentStatus: 'PENDING',
        bookingFeePaidNpr: 0,
        balanceDueNpr: offer.totalPriceNpr,
        shippingAddress: {},
        status: OrderStatus.CREATED,
        bookingExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amountNpr: bookingFee,
        currency: CurrencyCode.NPR,
        chargedAmount: quote.chargedAmount,
        chargedCurrency: quote.chargedCurrency,
        fxRate: quote.fxRate,
        fxSource: quote.fxSource,
        fxQuotedAt: quote.fxQuotedAt,
        idempotencyKey: dto.idempotencyKey,
        paymentGateway: method,
        status: PaymentStatus.PENDING,
        metadata: {
          rfqId: rfq.id,
          offerId: offer.id,
          customerEmail: rfq.customer?.email || null,
          paymentType: 'BOOKING_FEE',
          requestedMethod: dto.method,
          amountNpr: bookingFee,
          chargedAmount: quote.chargedAmount,
          chargedCurrency: quote.chargedCurrency,
          fxRate: quote.fxRate,
          fxSource: quote.fxSource,
          fxQuotedAt: quote.fxQuotedAt.toISOString(),
        },
      },
    });

    if (method === PaymentMethod.COD || method === PaymentMethod.BANK_TRANSFER) {
      return {
        paymentId: payment.id,
        orderId: order.id,
        rfqRequestId: dto.rfqRequestId,
        offerId: dto.offerId,
        amountNpr: bookingFee,
        amount: quote.chargedAmount,
        currency: quote.chargedCurrency,
        method,
      };
    }

    // Create gateway order
    let gatewayOrder: PaymentGatewayOrder;

    switch (method) {
      case PaymentMethod.RAZORPAY:
        gatewayOrder = await this.createRazorpayOrder(payment.id, quote.chargedAmount);
        break;
      case PaymentMethod.STRIPE:
        gatewayOrder = await this.createStripePaymentIntent(
          payment.id,
          quote,
          rfq.customer?.email,
          dto.idempotencyKey,
        );
        break;
      case PaymentMethod.ESEWA:
        gatewayOrder = await this.createEsewaOrder(payment.id, bookingFee);
        break;
      case PaymentMethod.KHALTI:
        gatewayOrder = await this.createKhaltiOrder(payment.id, bookingFee);
        break;
      default:
        throw new BadRequestException('Unsupported payment method for booking');
    }

    // Update payment with gateway order ID
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { gatewayOrderId: gatewayOrder.gatewayOrderId },
    });

    return {
      paymentId: payment.id,
      orderId: order.id,
      rfqRequestId: dto.rfqRequestId,
      offerId: dto.offerId,
      amountNpr: bookingFee,
      amount: quote.chargedAmount,
      currency: quote.chargedCurrency,
      fxRate: quote.fxRate,
      fxSource: quote.fxSource,
      fxQuotedAt: quote.fxQuotedAt,
      method,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      gatewayKey: gatewayOrder.gatewayKey,
    };
  }

  // Verify payment from gateway callback
  async verifyPayment(dto: VerifyPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status === PaymentStatus.COMPLETED) {
      return { success: true, paymentId: payment.id, idempotentReplay: true };
    }

    // Get the related order
    const order = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
      include: {
        shop: true,
        customer: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Payment order not found');
    }
    const chargedCurrency = payment.chargedCurrency || CurrencyCode.NPR;
    const chargedAmount = payment.chargedAmount ?? payment.amountNpr;
    const ledgerContext = await this.accounting.prepareMonetaryContext(
      chargedAmount,
      chargedCurrency,
      chargedCurrency === CurrencyCode.NPR
        ? undefined
        : {
            canonicalAmountNpr: payment.amountNpr,
            fxRate: payment.fxRate!,
            fxSource: payment.fxSource || '',
            fxQuotedAt: payment.fxQuotedAt || new Date(NaN),
          },
    );

    // Verify with gateway
    let isValid = false;
    switch (payment.paymentGateway) {
      case 'RAZORPAY':
        isValid = await this.verifyRazorpayPayment(
          dto.gatewayOrderId || '',
          dto.gatewayPaymentId || '',
          dto.signature || '',
        );
        break;
      case 'STRIPE':
        isValid = await this.verifyStripePayment(
          dto.gatewayPaymentId || '',
          payment,
        );
        break;
      case 'ESEWA':
        isValid = await this.verifyEsewaPayment(dto.gatewayPaymentId || '');
        break;
      case 'KHALTI':
        isValid = await this.verifyKhaltiPayment(dto.gatewayPaymentId || '');
        break;
      default:
        // For COD or unknown, we can manually verify
        isValid = true;
    }

    if (!isValid) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: { not: PaymentStatus.COMPLETED } },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Payment verification failed');
    }

    const duplicateGatewayPayment = await this.prisma.payment.findUnique({
      where: { gatewayPaymentId: dto.gatewayPaymentId },
    });
    if (duplicateGatewayPayment && duplicateGatewayPayment.id !== payment.id) {
      throw new BadRequestException(
        'Gateway payment ID is already associated with another payment',
      );
    }

    const completedNow = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: PaymentStatus.COMPLETED } },
        data: {
          status: PaymentStatus.COMPLETED,
          gatewayPaymentId: dto.gatewayPaymentId,
          completedAt: new Date(),
        },
      });
      if (claimed.count === 0) return false;
      const currentOrder = await tx.order.findUniqueOrThrow({
        where: { id: payment.orderId },
      });
      const newPaidAmount = Math.min(
        currentOrder.totalNpr,
        (currentOrder.bookingFeePaidNpr || 0) + payment.amountNpr,
      );
      const newBalanceDue = Math.max(0, currentOrder.totalNpr - newPaidAmount);
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          bookingFeePaidNpr: newPaidAmount,
          balanceDueNpr: newBalanceDue,
          paymentStatus: newBalanceDue <= 0 ? 'COMPLETED' : 'PARTIAL',
          status:
            newBalanceDue <= 0 ? OrderStatus.PAID : currentOrder.status,
        },
      });

      const metadata = payment.metadata as { rfqId?: string } | null;
      if (metadata?.rfqId) {
        await tx.rfqRequest.update({
          where: { id: metadata.rfqId },
          data: { status: 'CONFIRMED' },
        });
      }
      await this.accounting.postOrderPayment(tx, {
        ...ledgerContext,
        shopId: order.shopId,
        orderId: order.id,
        paymentReferenceId: payment.id,
        orderNumber: order.orderNumber,
        method: payment.paymentGateway,
        transactionDate: new Date(),
      });
      return true;
    });

    if (order && completedNow) {
      // Notify shopkeeper
      await this.notificationsService.create({
        userId: order.shop.userId,
        type: 'PAYMENT_RECEIVED',
        titleKey: 'notification.payment.received.title',
        titleParams: { amount: payment.amountNpr },
        bodyKey: 'notification.payment.received.body',
        bodyParams: { 
          orderNumber: order.orderNumber, 
          amount: payment.amountNpr 
        },
        referenceType: 'ORDER',
        referenceId: order.id,
        channels: ['EMAIL', 'PUSH'],
      });
    }

    return {
      success: true,
      paymentId: payment.id,
      idempotentReplay: !completedNow,
    };
  }

  // Process refund
  async processRefund(
    dto: RefundDto,
    requesterId?: string,
    requesterRole?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        customer: true,
        shop: { select: { userId: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Tenant isolation: a shopkeeper may only refund orders belonging to
    // their own shop. Admins may refund any order.
    if (requesterRole !== 'ADMIN') {
      if (!requesterId || order.shop?.userId !== requesterId) {
        throw new ForbiddenException('You can only refund your own shop orders');
      }
    }

    const requestFingerprint = crypto
      .createHash('sha256')
      .update(
        dto.idempotencyKey ||
          `${order.id}:${dto.amount}:${dto.reason || ''}:${requesterId || 'system'}`,
      )
      .digest('hex')
      .slice(0, 40);
    const idempotencyKey = `refund:${requestFingerprint}`;
    const ledgerContext = await this.accounting.prepareMonetaryContext(
      dto.amount,
      CurrencyCode.NPR,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${order.id}))`;
      const replay = await tx.payment.findUnique({ where: { idempotencyKey } });
      if (replay) {
        if (replay.orderId !== order.id) {
          throw new BadRequestException('Refund key belongs to another order');
        }
        return { refund: replay, idempotent: true };
      }

      const currentOrder = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
      });
      const paidAmount = currentOrder.bookingFeePaidNpr || 0;
      if (dto.amount > paidAmount) {
        throw new BadRequestException('Refund amount exceeds paid amount');
      }
      const refund = await tx.payment.create({
        data: {
          orderId: order.id,
          amountNpr: -dto.amount,
          currency: CurrencyCode.NPR,
          chargedAmount: -dto.amount,
          chargedCurrency: CurrencyCode.NPR,
          fxRate: 1,
          fxSource: 'identity',
          fxQuotedAt: ledgerContext.fxQuotedAt,
          idempotencyKey,
          paymentGateway: 'BANK_TRANSFER',
          status: PaymentStatus.COMPLETED,
          completedAt: new Date(),
          metadata: {
            reason: dto.reason,
            type: 'REFUND',
          },
        },
      });
      const newBookingFeePaid = Math.max(0, paidAmount - dto.amount);
      await tx.order.update({
        where: { id: order.id },
        data: {
          bookingFeePaidNpr: newBookingFeePaid,
          balanceDueNpr: currentOrder.totalNpr - newBookingFeePaid,
          status: OrderStatus.REFUNDED,
          paymentStatusEnum:
            newBookingFeePaid <= 0 ? 'REFUNDED' : 'PARTIAL',
        },
      });
      const invoice = await tx.invoice.findFirst({
        where: {
          orderId: order.id,
          status: { notIn: ['VOID', 'CANCELLED'] },
        },
        orderBy: { issuedAt: 'desc' },
        select: { totalAmount: true, taxAmount: true },
      });
      const taxRatio =
        invoice && invoice.totalAmount > 0
          ? invoice.taxAmount / invoice.totalAmount
          : undefined;
      await this.accounting.postOrderRefund(tx, {
        ...ledgerContext,
        shopId: order.shopId,
        orderId: order.id,
        refundReferenceId: refund.id,
        orderNumber: order.orderNumber,
        method: 'BANK_TRANSFER',
        transactionDate: refund.completedAt || new Date(),
        invoicedTaxRatio: taxRatio,
        actorUserId: requesterId,
      });
      const commission = await tx.commissionLedger.findUnique({
        where: { orderId: order.id },
      });
      if (commission && commission.amount > 0) {
        const adjustment = Math.min(
          commission.amount,
          commission.amount * (dto.amount / currentOrder.totalNpr),
        );
        if (adjustment > 0) {
          if (adjustment >= commission.amount - 0.0001) {
            await tx.commissionLedger.update({
              where: { id: commission.id },
              data: {
                amount: 0,
                status: 'REVERSED',
                notes: `Reversed by refund ${refund.id}`,
              },
            });
            await this.accounting.reverseReference(tx, {
              shopId: order.shopId,
              originalReferenceType: JournalReferenceType.COMMISSION_ACCRUAL,
              originalReferenceId: commission.id,
              reversalReferenceType: JournalReferenceType.REVERSAL,
              reversalReferenceId: `commission-refund:${refund.id}`,
              reason: `Commission reversed by refund on ${order.orderNumber}`,
              actorUserId: requesterId,
            });
          } else {
            await tx.commissionLedger.update({
              where: { id: commission.id },
              data: {
                amount: commission.amount - adjustment,
                notes: `Reduced by ${adjustment} NPR for refund ${refund.id}`,
              },
            });
            const commissionContext =
              await this.accounting.prepareMonetaryContext(
                adjustment,
                CurrencyCode.NPR,
              );
            await this.accounting.postCommissionRefundAdjustment(tx, {
              ...commissionContext,
              shopId: order.shopId,
              refundReferenceId: refund.id,
              orderNumber: order.orderNumber,
              transactionDate: refund.completedAt || new Date(),
              actorUserId: requesterId,
            });
          }
        }
      }
      return { refund, idempotent: false };
    });

    // Notify customer
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'REFUND_REQUESTED',
      titleKey: 'notification.refund.initiated.title',
      titleParams: { amount: dto.amount },
      bodyKey: 'notification.refund.initiated.body',
      bodyParams: { 
        orderNumber: order.orderNumber, 
        amount: dto.amount 
      },
      referenceType: 'ORDER',
      referenceId: order.id,
      channels: ['EMAIL', 'PUSH'],
    });

    return {
      refundId: result.refund.id,
      amount: Math.abs(result.refund.amountNpr),
      idempotentReplay: result.idempotent,
    };
  }

  // Get payment history for order
  async getOrderPayments(
    orderId: string,
    requesterId?: string,
    requesterRole?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true, shop: { select: { userId: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Tenant isolation: only the buying customer, the selling shop owner,
    // or an admin may read an order's payment history.
    if (requesterRole !== 'ADMIN') {
      const isCustomer = order.customerId === requesterId;
      const isShopOwner = order.shop?.userId === requesterId;
      if (!requesterId || (!isCustomer && !isShopOwner)) {
        throw new ForbiddenException('You cannot view payments for this order');
      }
    }

    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get user payment history
  async getUserPayments(userId: string, page = 1, limit = 20) {
    // Get orders for this customer
    const customerOrders = await this.prisma.order.findMany({
      where: { customerId: userId },
      select: { id: true },
    });
    const orderIds = customerOrders.map(o => o.id);

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { orderId: { in: orderIds } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where: { orderId: { in: orderIds } } }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Payment gateway helper methods (stubs - implement with actual SDKs)
  private async createRazorpayOrder(paymentId: string, amount: number): Promise<PaymentGatewayOrder> {
    // TODO: Implement Razorpay integration
    // const Razorpay = require('razorpay');
    // const instance = new Razorpay({ key_id: 'xxx', key_secret: 'xxx' });
    // const order = await instance.orders.create({ amount: amount * 100, currency: 'INR' });
    
    return {
      orderId: paymentId,
      amount,
      currency: 'INR',
      gatewayOrderId: `rpay_${Date.now()}`,
      gatewayKey: process.env.RAZORPAY_KEY_ID,
    };
  }

  private async createEsewaOrder(paymentId: string, amount: number): Promise<PaymentGatewayOrder> {
    // TODO: Implement eSewa integration
    return {
      orderId: paymentId,
      amount,
      currency: 'NPR',
      gatewayOrderId: `esewa_${Date.now()}`,
    };
  }

  private async createKhaltiOrder(paymentId: string, amount: number): Promise<PaymentGatewayOrder> {
    // TODO: Implement Khalti integration
    return {
      orderId: paymentId,
      amount,
      currency: 'NPR',
      gatewayOrderId: `khalti_${Date.now()}`,
    };
  }

  private toStripeMinorUnits(amount: number): number {
    return Math.round(amount * 100);
  }

  private async createStripePaymentIntent(
    paymentId: string,
    quote: ChargeQuote,
    customerEmail?: string,
    idempotencyKey?: string,
  ): Promise<PaymentGatewayOrder> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Stripe is not configured');
      }
      const mockId = `pi_${Date.now()}`;
      return {
        orderId: paymentId,
        amount: quote.chargedAmount,
        currency: quote.chargedCurrency,
        gatewayOrderId: mockId,
        gatewayKey: `${mockId}_secret_dev`,
      };
    }

    const stripe = new Stripe(secretKey);
    const intent = await stripe.paymentIntents.create(
      {
        amount: this.toStripeMinorUnits(quote.chargedAmount),
        currency: quote.chargedCurrency.toLowerCase(),
        receipt_email: customerEmail || undefined,
        metadata: {
          paymentId,
          amountNpr: String(quote.amountNpr),
          chargedAmount: String(quote.chargedAmount),
          chargedCurrency: quote.chargedCurrency,
          fxRate: String(quote.fxRate),
          fxSource: quote.fxSource,
          fxQuotedAt: quote.fxQuotedAt.toISOString(),
        },
      },
      { idempotencyKey: idempotencyKey || `payment-${paymentId}` },
    );

    return {
      orderId: paymentId,
      amount: quote.chargedAmount,
      currency: quote.chargedCurrency,
      gatewayOrderId: intent.id,
      gatewayKey: intent.client_secret || undefined,
    };
  }

  // Verify Stripe payment by retrieving the PaymentIntent from the Stripe API.
  // Uses the REST endpoint directly (no SDK dependency). Fails closed if the
  // secret key is not configured in production.
  private async verifyStripePayment(
    paymentIntentId: string,
    payment: {
      chargedAmount: number | null;
      chargedCurrency: CurrencyCode | null;
    },
  ): Promise<boolean> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return this.missingSecretResult('Stripe', 'STRIPE_SECRET_KEY');
    }
    if (!paymentIntentId) {
      this.logger.warn('[Stripe] verification called without a PaymentIntent id');
      return false;
    }

    try {
      const res = await fetch(
        `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(
          paymentIntentId,
        )}`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      );
      if (!res.ok) {
        this.logger.error(
          `[Stripe] PaymentIntent retrieve failed: HTTP ${res.status}`,
        );
        return false;
      }
      const intent = await res.json();
      const expectedCurrency = payment.chargedCurrency?.toLowerCase();
      const expectedAmount = payment.chargedAmount
        ? this.toStripeMinorUnits(payment.chargedAmount)
        : null;
      const actualAmount = intent?.amount_received || intent?.amount;
      return (
        intent?.status === 'succeeded' &&
        !!expectedCurrency &&
        expectedAmount !== null &&
        intent.currency === expectedCurrency &&
        actualAmount === expectedAmount
      );
    } catch (error) {
      this.logger.error(`[Stripe] verification error: ${error.message}`);
      return false;
    }
  }

  // Verify a Razorpay payment signature. Razorpay signs `orderId|paymentId`
  // with HMAC-SHA256 using the key secret; we recompute and timing-safe compare.
  private async verifyRazorpayPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return this.missingSecretResult('Razorpay', 'RAZORPAY_KEY_SECRET');
    }
    if (!orderId || !paymentId || !signature) {
      this.logger.warn('[Razorpay] verification called with missing fields');
      return false;
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return this.timingSafeEqualHex(expected, signature);
  }

  // Verify a Khalti ePayment by calling the lookup API with the pidx. The
  // gatewayPaymentId is expected to carry the Khalti `pidx`.
  private async verifyEsewaPayment(_paymentId: string): Promise<boolean> {
    // eSewa ePay v2 status verification requires the full transaction context
    // (product_code, total_amount, transaction_uuid) which is not available on
    // this manual-verify path — it is handled by the dedicated payment-gateway
    // module's signed callback. Fail closed here in production.
    if (!process.env.ESEWA_SECRET_KEY) {
      return this.missingSecretResult('eSewa', 'ESEWA_SECRET_KEY');
    }
    this.logger.error(
      '[eSewa] manual verification is not supported on this path; use the payment-gateway callback',
    );
    return process.env.NODE_ENV !== 'production';
  }

  private async verifyKhaltiPayment(pidx: string): Promise<boolean> {
    const secretKey = process.env.KHALTI_SECRET_KEY;
    if (!secretKey) {
      return this.missingSecretResult('Khalti', 'KHALTI_SECRET_KEY');
    }
    if (!pidx) {
      this.logger.warn('[Khalti] verification called without a pidx');
      return false;
    }

    const baseUrl =
      process.env.KHALTI_BASE_URL || 'https://khalti.com/api/v2';
    try {
      const res = await fetch(`${baseUrl}/epayment/lookup/`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pidx }),
      });
      if (!res.ok) {
        this.logger.error(`[Khalti] lookup failed: HTTP ${res.status}`);
        return false;
      }
      const data = await res.json();
      return data?.status === 'Completed';
    } catch (error) {
      this.logger.error(`[Khalti] verification error: ${error.message}`);
      return false;
    }
  }

  /**
   * Constant-time comparison of two hex-encoded strings. Returns false if the
   * lengths differ (which also guards against crypto.timingSafeEqual throwing
   * on unequal buffer lengths).
   */
  private timingSafeEqualHex(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length || bufA.length === 0) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Result when a gateway secret is not configured. Fails CLOSED in production
   * (a missing secret must never auto-approve a payment) and allows in
   * non-production so local/dev checkout flows keep working.
   */
  private missingSecretResult(gateway: string, envVar: string): boolean {
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        `[${gateway}] ${envVar} is not configured; refusing to confirm payment in production`,
      );
      return false;
    }
    this.logger.warn(
      `[${gateway}] ${envVar} not set; allowing in non-production only`,
    );
    return true;
  }
}
