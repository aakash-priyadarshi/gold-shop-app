import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommissionStatus, CurrencyCode } from '@prisma/client';

const COMMISSION_RATE = 0.01; // 1% commission
const SETTLEMENT_DAYS = 21;   // Days to settle commission

@Injectable()
export class CommissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create commission ledger entry when shopkeeper marks order as paid at shop
   */
  async createCommissionForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shop: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Calculate due date (21 days from now)
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + SETTLEMENT_DAYS);

    // Calculate commission amount
    const commissionAmount = order.totalNpr * COMMISSION_RATE;

    // Check if ledger entry already exists
    const existing = await this.prisma.commissionLedger.findUnique({
      where: { orderId },
    });

    if (existing) {
      // Update existing entry
      return this.prisma.commissionLedger.update({
        where: { orderId },
        data: {
          orderTotal: order.totalNpr,
          amount: commissionAmount,
          status: 'PENDING',
          dueAt,
          updatedAt: new Date(),
        },
      });
    }

    // Create new entry
    return this.prisma.commissionLedger.create({
      data: {
        orderId,
        shopId: order.shopId,
        orderTotal: order.totalNpr,
        commissionRate: COMMISSION_RATE,
        amount: commissionAmount,
        currency: order.displayCurrency || 'NPR',
        status: 'PENDING',
        dueAt,
      },
    });
  }

  /**
   * Mark commission as paid (admin only)
   */
  async markCommissionPaid(commissionId: string, notes?: string) {
    const commission = await this.prisma.commissionLedger.findUnique({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new NotFoundException('Commission record not found');
    }

    // Update commission status
    const updated = await this.prisma.commissionLedger.update({
      where: { id: commissionId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        notes: notes || commission.notes,
        updatedAt: new Date(),
      },
    });

    // Check if shop should be released from hold
    await this.checkAndReleaseShopHold(commission.shopId);

    return updated;
  }

  /**
   * Check for overdue commissions and put shops on hold
   * This should be called by a scheduled job
   */
  async processOverdueCommissions() {
    const now = new Date();

    // Find all pending commissions that are past due date
    const overdueCommissions = await this.prisma.commissionLedger.findMany({
      where: {
        status: 'PENDING',
        dueAt: { lt: now },
      },
      include: {
        shop: true,
        order: true,
      },
    });

    const results = {
      processed: 0,
      shopsOnHold: [] as string[],
    };

    for (const commission of overdueCommissions) {
      // Mark as overdue
      await this.prisma.commissionLedger.update({
        where: { id: commission.id },
        data: {
          status: 'OVERDUE',
          updatedAt: new Date(),
        },
      });

      // Put shop on hold
      await this.prisma.shop.update({
        where: { id: commission.shopId },
        data: {
          isOnHold: true,
          holdReason: `Overdue commission for order. Amount due: ${commission.amount} ${commission.currency}`,
          holdAt: new Date(),
          lastComplianceCheckAt: new Date(),
        },
      });

      results.processed++;
      if (!results.shopsOnHold.includes(commission.shopId)) {
        results.shopsOnHold.push(commission.shopId);
      }
    }

    return results;
  }

  /**
   * Check if shop has any overdue commissions and release hold if not
   */
  async checkAndReleaseShopHold(shopId: string) {
    const overdueCount = await this.prisma.commissionLedger.count({
      where: {
        shopId,
        status: 'OVERDUE',
      },
    });

    if (overdueCount === 0) {
      await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          isOnHold: false,
          holdReason: null,
          holdAt: null,
          lastComplianceCheckAt: new Date(),
        },
      });
    }
  }

  /**
   * Get all commissions (admin)
   */
  async getAllCommissions(options: {
    status?: CommissionStatus;
    shopId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, shopId, search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (shopId) where.shopId = shopId;
    
    // Search by shop name or order number
    if (search) {
      where.OR = [
        { shop: { businessName: { contains: search, mode: 'insensitive' } } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [commissions, total] = await Promise.all([
      this.prisma.commissionLedger.findMany({
        where,
        include: {
          shop: true,
          order: true,
        },
        orderBy: { dueAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.commissionLedger.count({ where }),
    ]);

    return {
      data: commissions,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get commissions for a specific shop
   */
  async getShopCommissions(shopId: string) {
    return this.prisma.commissionLedger.findMany({
      where: { shopId },
      orderBy: { dueAt: 'asc' },
    });
  }

  /**
   * Get commission summary for a shop
   */
  async getShopCommissionSummary(shopId: string) {
    const commissions = await this.prisma.commissionLedger.findMany({
      where: { shopId },
    });

    const summary = {
      totalPending: 0,
      totalOverdue: 0,
      totalPaid: 0,
      pendingCount: 0,
      overdueCount: 0,
      paidCount: 0,
      nextDueDate: null as Date | null,
    };

    for (const commission of commissions) {
      switch (commission.status) {
        case 'PENDING':
          summary.totalPending += commission.amount;
          summary.pendingCount++;
          if (!summary.nextDueDate || commission.dueAt < summary.nextDueDate) {
            summary.nextDueDate = commission.dueAt;
          }
          break;
        case 'OVERDUE':
          summary.totalOverdue += commission.amount;
          summary.overdueCount++;
          break;
        case 'PAID':
          summary.totalPaid += commission.amount;
          summary.paidCount++;
          break;
      }
    }

    return summary;
  }

  /**
   * Waive commission (admin only, for special cases)
   */
  async waiveCommission(commissionId: string, reason: string) {
    const commission = await this.prisma.commissionLedger.findUnique({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new NotFoundException('Commission record not found');
    }

    const updated = await this.prisma.commissionLedger.update({
      where: { id: commissionId },
      data: {
        status: 'WAIVED',
        notes: reason,
        updatedAt: new Date(),
      },
    });

    // Check if shop should be released from hold
    await this.checkAndReleaseShopHold(commission.shopId);

    return updated;
  }

  /**
   * Get commission stats (admin only)
   */
  async getCommissionStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      pendingStats,
      overdueStats,
      paidStats,
      shopsOnHold,
    ] = await Promise.all([
      this.prisma.commissionLedger.aggregate({
        where: { status: 'PENDING' },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.commissionLedger.aggregate({
        where: { status: 'OVERDUE' },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.commissionLedger.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: startOfMonth },
        },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.shop.count({
        where: { isOnHold: true },
      }),
    ]);

    return {
      totalPending: pendingStats._count,
      totalOverdue: overdueStats._count,
      totalPaid: paidStats._count,
      pendingAmount: pendingStats._sum.amount || 0,
      overdueAmount: overdueStats._sum.amount || 0,
      paidAmount: paidStats._sum.amount || 0,
      shopsOnHold,
    };
  }

  /**
   * Release shop hold (admin action)
   */
  async releaseShopHold(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        isOnHold: false,
        holdReason: null,
        holdAt: null,
        lastComplianceCheckAt: new Date(),
      },
    });
  }
}
