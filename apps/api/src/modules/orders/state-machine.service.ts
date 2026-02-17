import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OrderStatus, RefundStatus } from '@prisma/client';

/**
 * Explicit state machines for order and refund transitions.
 * Prevents illegal state jumps.
 */

// ─── Order Status Transitions ───
const ORDER_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['PAYMENT_PENDING', 'CANCELLED', 'EXPIRED'],
  PAYMENT_PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED', 'EXPIRED'],
  PAYMENT_FAILED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAID: ['PACKED', 'IN_PRODUCTION', 'CANCELLED'],
  PACKED: ['READY_TO_SHIP', 'QC_PENDING'],
  IN_PRODUCTION: ['QC_PENDING', 'CANCELLED'],
  QC_PENDING: ['QC_PASSED', 'QC_FAILED'],
  QC_PASSED: ['READY_TO_SHIP'],
  QC_FAILED: ['IN_PRODUCTION', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [], // terminal
  REFUNDED: [], // terminal
  EXPIRED: [], // terminal
};

// ─── Refund Status Transitions ───
const REFUND_TRANSITIONS: Record<string, string[]> = {
  NONE: ['REQUESTED'],
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PROCESSED'],
  REJECTED: ['REQUESTED'], // Customer can re-request after rejection
  PROCESSED: [], // terminal
};

@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);

  /**
   * Validate and return the next order status, or throw.
   */
  validateOrderTransition(currentStatus: string, nextStatus: string): void {
    const allowed = ORDER_TRANSITIONS[currentStatus];
    if (!allowed) {
      throw new BadRequestException(
        `Unknown order status: ${currentStatus}`,
      );
    }
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid order transition: ${currentStatus} → ${nextStatus}. ` +
          `Allowed: [${allowed.join(', ')}]`,
      );
    }
  }

  /**
   * Validate and return the next refund status, or throw.
   */
  validateRefundTransition(currentStatus: string, nextStatus: string): void {
    const current = currentStatus || 'NONE';
    const allowed = REFUND_TRANSITIONS[current];
    if (!allowed) {
      throw new BadRequestException(
        `Unknown refund status: ${current}`,
      );
    }
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid refund transition: ${current} → ${nextStatus}. ` +
          `Allowed: [${allowed.join(', ')}]`,
      );
    }
  }

  /**
   * Get allowed next states for an order.
   */
  getAllowedOrderTransitions(currentStatus: string): string[] {
    return ORDER_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Get allowed next states for a refund.
   */
  getAllowedRefundTransitions(currentStatus: string): string[] {
    return REFUND_TRANSITIONS[currentStatus || 'NONE'] || [];
  }

  /**
   * Check if an order status is terminal.
   */
  isTerminalOrderStatus(status: string): boolean {
    return (ORDER_TRANSITIONS[status] || []).length === 0;
  }

  /**
   * Check if a refund status is terminal.
   */
  isTerminalRefundStatus(status: string): boolean {
    return (REFUND_TRANSITIONS[status || 'NONE'] || []).length === 0;
  }
}
