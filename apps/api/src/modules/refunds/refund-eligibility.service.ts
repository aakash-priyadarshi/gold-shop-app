import { Injectable, Logger } from '@nestjs/common';

/**
 * Determines whether an order is eligible for refund based on material composition.
 *
 * Policy:
 * - Gold, Silver → refundable
 * - Diamond, gemstone-heavy, custom-cut stones → NOT refundable
 * - Mixed: only the metal portion is refundable
 */

const REFUNDABLE_MATERIALS = new Set([
  'GOLD',
  'SILVER',
  'GOLD_24K',
  'GOLD_22K',
  'GOLD_18K',
  'GOLD_14K',
  'SILVER_925',
  'SILVER_999',
]);

const NON_REFUNDABLE_MATERIALS = new Set([
  'DIAMOND',
  'GEMSTONE',
  'CUSTOM_CUT_STONE',
  'PEARL',
]);

const RETURN_WINDOW_DAYS = 7;

export interface EligibilityResult {
  eligible: boolean;
  refundableAmount: number;
  reason: string;
  metalPercentage?: number;
}

@Injectable()
export class RefundEligibilityService {
  private readonly logger = new Logger(RefundEligibilityService.name);

  /**
   * Check if an order is eligible for refund.
   *
   * @param order Order with productSnapshot and amount
   * @returns EligibilityResult
   */
  checkEligibility(order: {
    orderType: string;
    totalNpr: number;
    productSnapshot: any;
    createdAt: Date;
    status: string;
  }): EligibilityResult {
    // Must be delivered first
    if (order.status !== 'DELIVERED') {
      return { eligible: false, refundableAmount: 0, reason: 'Order must be delivered before requesting a refund' };
    }

    // Check return window
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreation > RETURN_WINDOW_DAYS) {
      return {
        eligible: false,
        refundableAmount: 0,
        reason: `Return window of ${RETURN_WINDOW_DAYS} days has expired`,
      };
    }

    // Inspect composition from product snapshot
    const snapshot = order.productSnapshot as any;
    const composition = snapshot?.composition;

    if (!composition) {
      return { eligible: false, refundableAmount: 0, reason: 'Product composition not available' };
    }

    // composition can be a string or an object with material breakdowns
    // String form: "GOLD", "GOLD_22K", "SILVER_925", etc.
    // Object form: { materials: [{ type: 'GOLD_22K', percentage: 80 }, { type: 'DIAMOND', percentage: 20 }] }

    if (typeof composition === 'string') {
      const mat = composition.toUpperCase();
      if (REFUNDABLE_MATERIALS.has(mat)) {
        return {
          eligible: true,
          refundableAmount: order.totalNpr,
          reason: `Full refund eligible — material: ${mat}`,
          metalPercentage: 100,
        };
      }
      if (NON_REFUNDABLE_MATERIALS.has(mat)) {
        return {
          eligible: false,
          refundableAmount: 0,
          reason: `${mat} products are not eligible for refund`,
        };
      }
      // Unknown material — default deny
      return { eligible: false, refundableAmount: 0, reason: `Material ${mat} refund policy not defined` };
    }

    // Object composition with material breakdown
    if (composition.materials && Array.isArray(composition.materials)) {
      let refundablePercentage = 0;

      for (const mat of composition.materials) {
        const matType = (mat.type || mat.material || '').toUpperCase();
        if (REFUNDABLE_MATERIALS.has(matType)) {
          refundablePercentage += mat.percentage || 0;
        }
        if (NON_REFUNDABLE_MATERIALS.has(matType)) {
          // Check if this is the dominant material
          if ((mat.percentage || 0) > 50) {
            return {
              eligible: false,
              refundableAmount: 0,
              reason: `Product is predominantly ${matType} (${mat.percentage}%), which is not refundable`,
            };
          }
        }
      }

      if (refundablePercentage === 0) {
        return { eligible: false, refundableAmount: 0, reason: 'No refundable materials in product' };
      }

      // Calculate partial refund based on metal percentage
      const refundableAmount = Math.round(
        order.totalNpr * (refundablePercentage / 100),
      );

      return {
        eligible: true,
        refundableAmount,
        reason: `Partial refund eligible — ${refundablePercentage}% metal content`,
        metalPercentage: refundablePercentage,
      };
    }

    return { eligible: false, refundableAmount: 0, reason: 'Unable to determine product composition' };
  }
}
