import { Process, Processor } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
@Processor("pos-expiry")
export class PosExpiryProcessor {
  constructor(private prisma: PrismaService) {}

  /**
   * Cron job: every 5 minutes, expire overdue POS sessions
   * and release their stock reservations.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePosExpiry() {
    const now = new Date();

    const expired = await this.prisma.posSession.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { lt: now },
      },
      select: { id: true },
    });

    if (expired.length === 0) return;

    const ids = expired.map((s) => s.id);

    // Release all stock reservations for expired sessions
    await this.prisma.stockReservation.deleteMany({
      where: { posSessionId: { in: ids } },
    });

    // Mark sessions as EXPIRED
    await this.prisma.posSession.updateMany({
      where: { id: { in: ids } },
      data: { status: "EXPIRED" },
    });

    console.log(`[POS Expiry] Expired ${ids.length} POS sessions`);
  }

  /**
   * Bull job handler (can also be triggered manually via queue)
   */
  @Process("expire-sessions")
  async handleExpireJob() {
    await this.handlePosExpiry();
  }
}
