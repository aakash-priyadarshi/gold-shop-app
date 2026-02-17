import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RefundEligibilityService } from './refund-eligibility.service';
import { RefundStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private eligibility: RefundEligibilityService,
  ) {}

  // ─── Customer: request a refund ───
  async requestRefund(customerId: string, orderId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shop: { select: { userId: true, shopName: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) {
      throw new BadRequestException('This order does not belong to you');
    }
    if (order.refundStatus && order.refundStatus !== RefundStatus.NONE) {
      throw new ConflictException(
        `Refund already ${order.refundStatus.toLowerCase()} for this order`,
      );
    }

    // Check eligibility
    const eligibilityResult = this.eligibility.checkEligibility({
      orderType: order.orderType,
      totalNpr: order.totalNpr,
      productSnapshot: order.productSnapshot,
      createdAt: order.createdAt,
      status: order.status,
    });

    if (!eligibilityResult.eligible) {
      throw new BadRequestException(
        `Refund not eligible: ${eligibilityResult.reason}`,
      );
    }

    // Generate idempotency key
    const idempotencyKey = `refund-${orderId}-${randomUUID()}`;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        refundStatus: RefundStatus.REQUESTED,
        refundableAmount: eligibilityResult.refundableAmount,
        refundReason: reason,
        refundRequestedAt: new Date(),
        refundIdempotencyKey: idempotencyKey,
        detailedStatus: 'REFUND_REQUESTED',
      },
    });

    await this.audit.log({
      userId: customerId,
      actorType: 'CUSTOMER',
      action: 'REFUND_REQUESTED',
      resourceType: 'Order',
      resourceId: orderId,
      metadata: {
        reason,
        refundableAmount: eligibilityResult.refundableAmount,
        metalPercentage: eligibilityResult.metalPercentage,
      },
    });

    // Notify support / admin
    // (In production, you'd notify specific support staff)
    await this.notifications.create({
      userId: order.shop.userId,
      type: 'REFUND_REQUESTED',
      titleKey: 'notification.refund.requested.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.refund.requested.body',
      bodyParams: { reason, amount: eligibilityResult.refundableAmount },
      referenceType: 'ORDER',
      referenceId: orderId,
      channels: ['EMAIL', 'PUSH'],
    });

    return {
      orderId,
      refundStatus: 'REQUESTED',
      refundableAmount: eligibilityResult.refundableAmount,
      reason: eligibilityResult.reason,
    };
  }

  // ─── Support/Admin: approve refund ───
  async approveRefund(orderId: string, approvedById: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.refundStatus !== RefundStatus.REQUESTED) {
      throw new BadRequestException('Order is not in REQUESTED refund state');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { refundStatus: RefundStatus.APPROVED },
    });

    await this.audit.log({
      userId: approvedById,
      actorType: 'SUPPORT',
      action: 'REFUND_APPROVED',
      resourceType: 'Order',
      resourceId: orderId,
    });

    await this.notifications.create({
      userId: order.customerId,
      type: 'REFUND_APPROVED',
      titleKey: 'notification.refund.approved.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.refund.approved.body',
      bodyParams: { amount: order.refundableAmount },
      referenceType: 'ORDER',
      referenceId: orderId,
      channels: ['EMAIL', 'PUSH'],
    });

    return { orderId, refundStatus: 'APPROVED' };
  }

  // ─── Support/Admin: reject refund ───
  async rejectRefund(orderId: string, rejectedById: string, rejectionReason: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.refundStatus !== RefundStatus.REQUESTED) {
      throw new BadRequestException('Order is not in REQUESTED refund state');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { refundStatus: RefundStatus.REJECTED },
    });

    await this.audit.log({
      userId: rejectedById,
      actorType: 'SUPPORT',
      action: 'REFUND_REJECTED',
      resourceType: 'Order',
      resourceId: orderId,
      metadata: { rejectionReason },
    });

    await this.notifications.create({
      userId: order.customerId,
      type: 'REFUND_REJECTED',
      titleKey: 'notification.refund.rejected.title',
      titleParams: { orderNumber: order.orderNumber },
      bodyKey: 'notification.refund.rejected.body',
      bodyParams: { reason: rejectionReason },
      referenceType: 'ORDER',
      referenceId: orderId,
      channels: ['EMAIL', 'PUSH'],
    });

    return { orderId, refundStatus: 'REJECTED' };
  }

  // ─── Admin: process approved refund (trigger payout + commission reversal) ───
  async processRefund(orderId: string, processedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { shop: true },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.refundStatus !== RefundStatus.APPROVED) {
        throw new BadRequestException('Order refund must be APPROVED before processing');
      }

      // Idempotency check
      if (order.refundProcessedAt) {
        throw new ConflictException('Refund already processed');
      }

      const refundAmount = Number(order.refundableAmount) || order.totalNpr;

      // 1. Update order
      await tx.order.update({
        where: { id: orderId },
        data: {
          refundStatus: RefundStatus.PROCESSED,
          refundProcessedAt: new Date(),
          refundProcessedById: processedById,
        },
      });

      // 2. Create negative commission ledger entry (reversal)
      const existingCommission = await tx.commissionLedger.findUnique({
        where: { orderId },
      });

      if (existingCommission) {
        await tx.commissionLedger.update({
          where: { orderId },
          data: {
            status: 'REVERSED',
            notes: `Reversed due to refund. Original amount: ${existingCommission.amount}`,
            updatedAt: new Date(),
          },
        });
      }

      // 3. Update seller performance metrics (non-critical)
      try {
        await tx.sellerPerformance.updateMany({
          where: { shopId: order.shopId },
          data: { refundedOrders: { increment: 1 } },
        });
      } catch (e) {
        this.logger.warn(`Failed to update seller performance: ${e}`);
      }

      // 4. Audit log
      await this.audit.log({
        userId: processedById,
        actorType: 'ADMIN',
        action: 'REFUND_PROCESSED',
        resourceType: 'Order',
        resourceId: orderId,
        metadata: {
          refundAmount,
          commissionReversed: !!existingCommission,
          idempotencyKey: order.refundIdempotencyKey,
        },
      });

      // 5. Notify customer
      await this.notifications.create({
        userId: order.customerId,
        type: 'REFUND_PROCESSED',
        titleKey: 'notification.refund.processed.title',
        titleParams: { orderNumber: order.orderNumber },
        bodyKey: 'notification.refund.processed.body',
        bodyParams: { amount: refundAmount },
        referenceType: 'ORDER',
        referenceId: orderId,
        channels: ['EMAIL', 'PUSH'],
      });

      return { orderId, refundStatus: 'PROCESSED', refundAmount };
    });
  }

  // ─── Check eligibility (read-only) ───
  async checkEligibility(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    return this.eligibility.checkEligibility({
      orderType: order.orderType,
      totalNpr: order.totalNpr,
      productSnapshot: order.productSnapshot,
      createdAt: order.createdAt,
      status: order.status,
    });
  }

  // ─── List refund requests (for support/admin) ───
  async listRefundRequests(status?: string) {
    const where: any = {};
    if (status) where.refundStatus = status;
    else where.refundStatus = { not: RefundStatus.NONE };

    return this.prisma.order.findMany({
      where,
      orderBy: { refundRequestedAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        refundStatus: true,
        refundableAmount: true,
        refundReason: true,
        refundRequestedAt: true,
        refundProcessedAt: true,
        totalNpr: true,
        displayCurrency: true,
        productSnapshot: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        shop: { select: { id: true, shopName: true } },
      },
    });
  }
}
