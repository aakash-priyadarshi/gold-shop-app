import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CommissionCheckProcessor {
  private readonly logger = new Logger(CommissionCheckProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check for overdue commissions daily at 1 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleOverdueCommissions() {
    this.logger.log('Starting daily commission check...');

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

    this.logger.log(`Found ${overdueCommissions.length} overdue commissions`);

    const results = {
      processed: 0,
      shopsOnHold: [] as string[],
    };

    for (const commission of overdueCommissions) {
      try {
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
            holdReason: `Overdue commission for order ${commission.order?.orderNumber || commission.orderId}. Amount due: ${commission.amount} ${commission.currency}`,
            holdAt: new Date(),
            lastComplianceCheckAt: new Date(),
          },
        });

        results.processed++;
        if (!results.shopsOnHold.includes(commission.shopId)) {
          results.shopsOnHold.push(commission.shopId);
        }

        this.logger.log(`Marked commission ${commission.id} as OVERDUE and put shop ${commission.shopId} on hold`);
      } catch (error) {
        this.logger.error(`Failed to process commission ${commission.id}:`, error);
      }
    }

    this.logger.log(`Commission check complete. Processed: ${results.processed}, Shops on hold: ${results.shopsOnHold.length}`);

    return results;
  }

  /**
   * Run compliance check manually (for testing or admin trigger)
   */
  async runComplianceCheck() {
    return this.handleOverdueCommissions();
  }
}
