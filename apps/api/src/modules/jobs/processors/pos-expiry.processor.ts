import { Process, Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { CronMetricsService } from "../../metrics/cron-metrics.service";

@Injectable()
@Processor("pos-expiry")
export class PosExpiryProcessor {
  constructor(
    private prisma: PrismaService,
    private cronMetrics: CronMetricsService,
  ) {}

  /**
   * Cron job: every 5 minutes, expire overdue POS sessions
   * and release their stock reservations.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePosExpiry() {
    await this.cronMetrics.trackExecution(
      "pos-expiry",
      "api",
      "EVERY_5_MINUTES",
      async () => {
        const now = new Date();

        const expired = await this.prisma.posSession.findMany({
          where: {
            status: "ACTIVE",
            expiresAt: { lt: now },
          },
          select: { id: true },
        });

        if (expired.length === 0) return 0;

        const ids = expired.map((s) => s.id);

        await this.prisma.stockReservation.deleteMany({
          where: { posSessionId: { in: ids } },
        });

        await this.prisma.posSession.updateMany({
          where: { id: { in: ids } },
          data: { status: "EXPIRED" },
        });

        return ids.length;
      },
    );
  }

  /**
   * Bull job handler (can also be triggered manually via queue)
   */
  @Process("expire-sessions")
  async handleExpireJob() {
    await this.handlePosExpiry();
  }
}
