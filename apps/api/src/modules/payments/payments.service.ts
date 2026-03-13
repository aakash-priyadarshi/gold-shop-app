import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import {
  InitiatePaymentDto,
  VerifyPaymentDto,
  InitiateBookingPaymentDto,
  RefundDto,
  PaymentMethod,
  PaymentType,
} from './dto/payment.dto';

// Payment gateway interfaces
interface PaymentGatewayOrder {
  orderId: string;
  amount: number;
  currency: string;
  gatewayOrderId: string;
  gatewayKey?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {}

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

    // Calculate payment amount based on type
    let amount: number;
    switch (dto.paymentType) {
      case PaymentType.FULL_PAYMENT:
        amount = order.totalNpr;
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

    if (amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amountNpr: amount,
        currency: 'NPR',
        paymentGateway: dto.method,
        status: PaymentStatus.PENDING,
        metadata: {
          orderNumber: order.orderNumber,
          customerEmail: order.customer.email,
          paymentType: dto.paymentType,
        },
      },
    });

    // Create gateway order based on method
    let gatewayOrder: PaymentGatewayOrder;

    switch (dto.method) {
      case PaymentMethod.RAZORPAY:
        gatewayOrder = await this.createRazorpayOrder(payment.id, amount);
        break;
      case PaymentMethod.STRIPE:
        // For UK/USA customers - convert NPR to appropriate currency
        // In production, use proper currency conversion
        const stripeCurrency = order.displayCurrency || 'USD';
        gatewayOrder = await this.createStripePaymentIntent(
          payment.id, 
          amount, 
          stripeCurrency,
          order.customer.email,
        );
        break;
      case PaymentMethod.ESEWA:
        gatewayOrder = await this.createEsewaOrder(payment.id, amount);
        break;
      case PaymentMethod.KHALTI:
        gatewayOrder = await this.createKhaltiOrder(payment.id, amount);
        break;
      case PaymentMethod.COD:
        // For COD, just mark as pending COD
        return {
          paymentId: payment.id,
          method: 'COD',
          message: 'Pay on delivery',
        };
      default:
        throw new BadRequestException('Unsupported payment method');
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
      amount,
      currency: 'NPR',
      method: dto.method,
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

    const bookingFee = offer.bookingFeeNpr || 0;
    if (bookingFee <= 0) {
      throw new BadRequestException('No booking fee required');
    }

    // Get customer's preferred currency
    const customer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredCurrency: true },
    });

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
        displayCurrency: customer?.preferredCurrency || 'NPR',
        paymentMethod: dto.method,
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
        currency: 'NPR',
        paymentGateway: dto.method,
        status: PaymentStatus.PENDING,
        metadata: {
          rfqId: rfq.id,
          offerId: offer.id,
          customerEmail: rfq.customer?.email || null,
          paymentType: 'BOOKING_FEE',
        },
      },
    });

    // Create gateway order
    let gatewayOrder: PaymentGatewayOrder;

    switch (dto.method) {
      case PaymentMethod.RAZORPAY:
        gatewayOrder = await this.createRazorpayOrder(payment.id, bookingFee);
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
      amount: bookingFee,
      currency: 'NPR',
      method: dto.method,
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

    // Get the related order
    const order = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
      include: {
        shop: true,
        customer: true,
      },
    });

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
          dto.signature,
        );
        break;
      case 'ESEWA':
        isValid = await this.verifyEsewaPayment(dto.gatewayPaymentId || '', payment.amountNpr);
        break;
      case 'KHALTI':
        isValid = await this.verifyKhaltiPayment(dto.gatewayPaymentId || '');
        break;
      default:
        // For COD or unknown, we can manually verify
        isValid = true;
    }

    if (!isValid) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Payment verification failed');
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        gatewayPaymentId: dto.gatewayPaymentId,
        completedAt: new Date(),
      },
    });

    // Update order
    if (order) {
      const newBookingFeePaid = (order.bookingFeePaidNpr || 0) + payment.amountNpr;
      const newBalanceDue = order.totalNpr - newBookingFeePaid;

      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          bookingFeePaidNpr: newBookingFeePaid,
          balanceDueNpr: newBalanceDue,
          paymentStatus: newBalanceDue <= 0 ? 'COMPLETED' : 'PARTIAL',
          status: newBalanceDue <= 0 ? OrderStatus.PAID : order.status,
        },
      });

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

      // Check if this was a booking fee and update RFQ status
      const metadata = payment.metadata as { rfqId?: string } | null;
      if (metadata?.rfqId) {
        await this.prisma.rfqRequest.update({
          where: { id: metadata.rfqId },
          data: { status: 'CONFIRMED' },
        });
      }
    }

    return { success: true, paymentId: payment.id };
  }

  // Process refund
  async processRefund(dto: RefundDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const paidAmount = order.bookingFeePaidNpr || 0;
    if (dto.amount > paidAmount) {
      throw new BadRequestException('Refund amount exceeds paid amount');
    }

    // Create refund payment record (negative amount indicates refund)
    const refund = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amountNpr: -dto.amount, // Negative for refund
        currency: 'NPR',
        paymentGateway: 'BANK_TRANSFER', // Default for refunds
        status: PaymentStatus.PROCESSING,
        metadata: {
          reason: dto.reason,
          type: 'REFUND',
        },
      },
    });

    // Update order
    const newBookingFeePaid = Math.max(0, paidAmount - dto.amount);
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        bookingFeePaidNpr: newBookingFeePaid,
        balanceDueNpr: order.totalNpr - newBookingFeePaid,
        status: OrderStatus.REFUNDED,
      },
    });

    // Notify customer
    await this.notificationsService.create({
      userId: order.customerId,
      type: 'SYSTEM_ALERT',
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

    return { refundId: refund.id, amount: dto.amount };
  }

  // Get payment history for order
  async getOrderPayments(orderId: string) {
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

  // Payment gateway helper methods
  private async createRazorpayOrder(paymentId: string, amount: number): Promise<PaymentGatewayOrder> {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (keyId && keySecret) {
      try {
        // Create Razorpay order via REST API (avoids requiring the razorpay npm package).
        // Note: Razorpay processes in INR (paisa). The `amount` parameter is in NPR;
        // in production, apply an NPR→INR conversion rate before sending to Razorpay.
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100), // Razorpay expects smallest currency unit (paisa)
            currency: 'INR',
            receipt: paymentId,
            notes: { paymentId, originalAmountNpr: String(amount) },
          }),
        });

        if (response.ok) {
          const order = await response.json() as { id: string };
          return {
            orderId: paymentId,
            amount,
            currency: 'NPR', // Internal display currency; gateway processes in INR
            gatewayOrderId: order.id,
            gatewayKey: keyId,
          };
        }
        this.logger.warn(`Razorpay order creation failed: ${response.status}`);
      } catch (err: any) {
        this.logger.error(`Razorpay order creation error: ${err.message}`);
      }
    }

    // Fallback: return a dev/unconfigured stub
    return {
      orderId: paymentId,
      amount,
      currency: 'NPR',
      gatewayOrderId: `rpay_${Date.now()}`,
      gatewayKey: keyId,
    };
  }

  private async createEsewaOrder(paymentId: string, amount: number): Promise<PaymentGatewayOrder> {
    const merchantId = this.configService.get<string>('ESEWA_MERCHANT_ID') || 'EPAYTEST';
    return {
      orderId: paymentId,
      amount,
      currency: 'NPR',
      gatewayOrderId: paymentId,
      gatewayKey: merchantId,
    };
  }

  private async createKhaltiOrder(paymentId: string, amount: number): Promise<PaymentGatewayOrder> {
    const publicKey = this.configService.get<string>('KHALTI_PUBLIC_KEY');
    const secretKey = this.configService.get<string>('KHALTI_SECRET_KEY');

    if (secretKey) {
      try {
        const response = await fetch('https://khalti.com/api/v2/payment/initiate/', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: paymentId,
            amount: Math.round(amount * 100), // Khalti expects paisa
          }),
        });

        if (response.ok) {
          const result = await response.json() as { token: string };
          return {
            orderId: paymentId,
            amount,
            currency: 'NPR',
            gatewayOrderId: result.token || paymentId,
            gatewayKey: publicKey,
          };
        }
        this.logger.warn(`Khalti order creation failed: ${response.status}`);
      } catch (err: any) {
        this.logger.error(`Khalti order creation error: ${err.message}`);
      }
    }

    return {
      orderId: paymentId,
      amount,
      currency: 'NPR',
      gatewayOrderId: `khalti_${Date.now()}`,
      gatewayKey: publicKey,
    };
  }

  // Create Stripe Payment Intent for UK/USA customers
  private async createStripePaymentIntent(
    paymentId: string,
    amount: number,
    currency: string,
    customerEmail?: string,
  ): Promise<PaymentGatewayOrder> {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (secretKey) {
      try {
        const params = new URLSearchParams({
          amount: String(Math.round(amount * 100)),
          currency: currency.toLowerCase(),
          'metadata[paymentId]': paymentId,
        });
        if (customerEmail) params.set('receipt_email', customerEmail);

        const response = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (response.ok) {
          const intent = await response.json() as { id: string; client_secret: string };
          return {
            orderId: paymentId,
            amount,
            currency,
            gatewayOrderId: intent.id,
            gatewayKey: intent.client_secret,
          };
        }
        this.logger.warn(`Stripe payment intent creation failed: ${response.status}`);
      } catch (err: any) {
        this.logger.error(`Stripe payment intent creation error: ${err.message}`);
      }
    }

    // Fallback stub for development
    const mockClientSecret = `pi_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`;
    return {
      orderId: paymentId,
      amount,
      currency,
      gatewayOrderId: `pi_${Date.now()}`,
      gatewayKey: mockClientSecret,
    };
  }

  // Verify Stripe webhook payment status
  private async verifyStripePayment(
    paymentIntentId: string,
    _signature?: string,
  ): Promise<boolean> {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) return true; // Dev mode

    try {
      const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
        headers: { 'Authorization': `Bearer ${secretKey}` },
      });
      if (response.ok) {
        const intent = await response.json() as { status: string };
        return intent.status === 'succeeded';
      }
      this.logger.warn(`Stripe payment intent fetch failed: ${response.status}`);
      return false;
    } catch (err: any) {
      this.logger.error(`Stripe verification error: ${err.message}`);
      return false;
    }
  }

  private async verifyRazorpayPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keySecret) return true; // Dev mode: skip verification

    const generated = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const generatedBuf = Buffer.from(generated, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');

    // timingSafeEqual requires equal-length buffers
    if (generatedBuf.length !== signatureBuf.length) return false;

    return crypto.timingSafeEqual(generatedBuf, signatureBuf);
  }

  private async verifyEsewaPayment(refId: string, amount: number): Promise<boolean> {
    const merchantId = this.configService.get<string>('ESEWA_MERCHANT_ID');
    if (!merchantId) return true; // Dev mode

    // eSewa transaction status check
    try {
      const url = new URL('https://esewa.com.np/epay/transrec');
      url.searchParams.set('amt', String(amount));
      url.searchParams.set('scd', merchantId);
      url.searchParams.set('pid', refId);
      url.searchParams.set('rid', refId);

      const response = await fetch(url.toString(), { method: 'POST' });
      const text = await response.text();
      return text.includes('<response_code>Success</response_code>');
    } catch (err: any) {
      this.logger.error(`eSewa verification error: ${err.message}`);
      return false;
    }
  }

  private async verifyKhaltiPayment(token: string): Promise<boolean> {
    const secretKey = this.configService.get<string>('KHALTI_SECRET_KEY');
    if (!secretKey) return true; // Dev mode

    try {
      const response = await fetch('https://khalti.com/api/v2/payment/verify/', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const result = await response.json() as { state?: { name: string } };
        return result?.state?.name === 'Completed';
      }
      this.logger.warn(`Khalti verification failed: ${response.status}`);
      return false;
    } catch (err: any) {
      this.logger.error(`Khalti verification error: ${err.message}`);
      return false;
    }
  }
}
