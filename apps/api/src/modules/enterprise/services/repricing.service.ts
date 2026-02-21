import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class RepricingService {
  private readonly logger = new Logger(RepricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createRule(
    shopId: string,
    createdByUserId: string,
    data: {
      ruleName: string;
      ruleType: string;
      conditions: Record<string, unknown>;
      action: Record<string, unknown>;
      priority?: number;
    },
  ) {
    return this.prisma.repricingRule.create({
      data: {
        shopId,
        ruleName: data.ruleName,
        ruleType: data.ruleType as any,
        conditions: data.conditions as any,
        action: data.action as any,
        priority: data.priority ?? 0,
        createdByUserId,
      },
    });
  }

  async listRules(shopId: string) {
    return this.prisma.repricingRule.findMany({
      where: { shopId },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  }

  async getRule(shopId: string, ruleId: string) {
    const rule = await this.prisma.repricingRule.findFirst({
      where: { id: ruleId, shopId },
    });
    if (!rule) throw new NotFoundException("Repricing rule not found");
    return rule;
  }

  async updateRule(
    shopId: string,
    ruleId: string,
    data: Partial<{
      ruleName: string;
      conditions: Record<string, unknown>;
      action: Record<string, unknown>;
      isActive: boolean;
      priority: number;
    }>,
  ) {
    const rule = await this.getRule(shopId, ruleId);
    return this.prisma.repricingRule.update({
      where: { id: rule.id },
      data: {
        ...(data.ruleName !== undefined && { ruleName: data.ruleName }),
        ...(data.conditions && { conditions: data.conditions as any }),
        ...(data.action && { action: data.action as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.priority !== undefined && { priority: data.priority }),
      },
    });
  }

  async deleteRule(shopId: string, ruleId: string) {
    const rule = await this.getRule(shopId, ruleId);
    return this.prisma.repricingRule.delete({ where: { id: rule.id } });
  }

  /**
   * Evaluate all active repricing rules for a shop.
   * Called by a Bull cron job or when market rates change.
   */
  async evaluateRules(shopId: string) {
    const rules = await this.prisma.repricingRule.findMany({
      where: { shopId, isActive: true },
      orderBy: { priority: "desc" },
    });

    const results: Array<{
      ruleId: string;
      ruleName: string;
      triggered: boolean;
      itemsAffected: number;
    }> = [];

    for (const rule of rules) {
      try {
        const affected = await this.evaluateRule(shopId, rule);
        results.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          triggered: affected > 0,
          itemsAffected: affected,
        });

        if (affected > 0) {
          await this.prisma.repricingRule.update({
            where: { id: rule.id },
            data: {
              lastTriggeredAt: new Date(),
              triggerCount: { increment: 1 },
            },
          });
        }
      } catch (error) {
        this.logger.warn(`Rule ${rule.id} evaluation failed: ${error.message}`);
      }
    }

    return results;
  }

  private async evaluateRule(shopId: string, rule: any): Promise<number> {
    const conditions = rule.conditions as Record<string, unknown>;
    const action = rule.action as Record<string, unknown>;

    switch (rule.ruleType) {
      case "LOW_STOCK": {
        const threshold = (conditions.stockThreshold as number) || 5;
        const adjustPercent = (action.adjustPercent as number) || 5;

        const items = await this.prisma.inventoryItem.findMany({
          where: {
            shopId,
            stockQuantity: { lte: threshold },
            status: "ACTIVE" as any,
          },
        });

        // In production: apply price adjustments
        this.logger.log(
          `LOW_STOCK rule: ${items.length} items below threshold ${threshold}, would adjust by ${adjustPercent}%`,
        );
        return items.length;
      }

      case "TIME_BASED": {
        const dayOfWeek = new Date().getDay();
        const activeDays = (conditions.activeDays as number[]) || [0, 6]; // weekend default
        if (!activeDays.includes(dayOfWeek)) return 0;

        const category = conditions.category as string;
        const items = await this.prisma.inventoryItem.findMany({
          where: {
            shopId,
            ...(category ? { category: category as any } : {}),
            status: "ACTIVE" as any,
          },
        });

        return items.length;
      }

      default:
        return 0;
    }
  }
}
