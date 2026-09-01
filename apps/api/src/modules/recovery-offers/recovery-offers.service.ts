import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MarketRegion,
  Prisma,
  RecoveryOfferStatus,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { CronTime } from "cron";
import { PrismaService } from "../../prisma/prisma.service";
import { EMAIL_SENDERS, MailService } from "../mail/mail.service";
import { RecoveryOfferDeliveryTiming } from "./dto/recovery-offer.dto";

const DEFAULT_CAMPAIGN_KEY = "incident-recovery-2026-08";
const RECOVERY_DAYS = 40;
const DAY_MS = 24 * 60 * 60 * 1000;
export const RECOVERY_OFFERS_QUEUE = "recovery-offers";
export const DELIVER_RECOVERY_OFFER_JOB = "deliver";

const LOCAL_TEN_AM_TIME_ZONES: Partial<Record<MarketRegion, string>> = {
  IN: "Asia/Kolkata",
  NP: "Asia/Kathmandu",
  AE: "Asia/Dubai",
  UK: "Europe/London",
};

export type RecoveryOfferDeliveryJob = {
  offerId: string;
  rawToken: string;
};

type Candidate = {
  userId: string;
  shopId: string;
  email: string;
  firstName: string;
  shopName: string;
  country: MarketRegion;
  reportIds: string[];
};

type Exclusion = {
  userId?: string;
  email?: string;
  reason: string;
};

@Injectable()
export class RecoveryOffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    @InjectQueue(RECOVERY_OFFERS_QUEUE)
    private readonly queue: Queue<RecoveryOfferDeliveryJob>,
  ) {}

  async preview(reportIds: string[], campaignKey?: string) {
    const key = this.normalizeCampaignKey(campaignKey);
    const { candidates, excluded } = await this.resolveCandidates(
      reportIds,
      key,
    );

    return {
      campaignKey: key,
      days: RECOVERY_DAYS,
      selectedReports: [...new Set(reportIds)].length,
      eligible: candidates.map((candidate) => ({
        userId: candidate.userId,
        shopId: candidate.shopId,
        email: candidate.email,
        firstName: candidate.firstName,
        shopName: candidate.shopName,
        country: candidate.country,
        reportCount: candidate.reportIds.length,
      })),
      excluded,
    };
  }

  async send(input: {
    reportIds: string[];
    campaignKey?: string;
    expiresInDays?: number;
    deliveryTiming?: RecoveryOfferDeliveryTiming;
    confirmed: boolean;
    adminId: string;
  }) {
    if (!input.confirmed) {
      throw new BadRequestException(
        "Preview and confirm the recovery recipients before sending",
      );
    }

    const key = this.normalizeCampaignKey(input.campaignKey);
    const expiresInDays = input.expiresInDays ?? 30;
    const { candidates, excluded } = await this.resolveCandidates(
      input.reportIds,
      key,
    );
    const results: Array<{
      userId: string;
      email: string;
      status: "queued" | "scheduled" | "failed";
      reason?: string;
      scheduledFor?: Date;
    }> = [];

    for (const candidate of candidates) {
      const delivery = this.resolveDelivery(
        candidate.country,
        input.deliveryTiming,
      );
      if (!delivery) {
        excluded.push({
          userId: candidate.userId,
          email: candidate.email,
          reason: `A local 10:00 AM delivery time is not configured for ${candidate.country}`,
        });
        continue;
      }
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = this.hashToken(rawToken);
      const startsAt = delivery.scheduledFor || new Date();
      const expiresAt = new Date(startsAt.getTime() + expiresInDays * DAY_MS);
      let offerId: string | null = null;
      const existing = await this.prisma.recoveryOffer.findUnique({
        where: {
          campaignKey_shopId: { campaignKey: key, shopId: candidate.shopId },
        },
        select: { id: true, status: true },
      });

      if (existing) {
        const prepared = await this.prisma.recoveryOffer.updateMany({
          where: { id: existing.id, status: RecoveryOfferStatus.SEND_FAILED },
          data: {
            email: candidate.email,
            tokenHash,
            sourceReportIds: candidate.reportIds,
            expiresAt,
            scheduledFor: delivery.scheduledFor,
            status: RecoveryOfferStatus.PREPARED,
            failureReason: null,
            createdBy: input.adminId,
          },
        });
        if (prepared.count === 1) offerId = existing.id;
      } else {
        try {
          const created = await this.prisma.recoveryOffer.create({
            data: {
              campaignKey: key,
              userId: candidate.userId,
              shopId: candidate.shopId,
              email: candidate.email,
              tokenHash,
              days: RECOVERY_DAYS,
              status: RecoveryOfferStatus.PREPARED,
              sourceReportIds: candidate.reportIds,
              expiresAt,
              scheduledFor: delivery.scheduledFor,
              createdBy: input.adminId,
            },
          });
          offerId = created.id;
        } catch (error) {
          if (
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== "P2002"
          ) {
            throw error;
          }
        }
      }

      if (!offerId) {
        excluded.push({
          userId: candidate.userId,
          email: candidate.email,
          reason: "Recovery offer is already being processed",
        });
        continue;
      }

      try {
        await this.queue.add(
          DELIVER_RECOVERY_OFFER_JOB,
          { offerId, rawToken },
          {
            jobId: `${offerId}-${tokenHash}`,
            attempts: 3,
            backoff: { type: "exponential", delay: 5_000 },
            ...(delivery.delayMs > 0 ? { delay: delivery.delayMs } : {}),
            removeOnComplete: true,
            removeOnFail: true,
          },
        );
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "Queueing failed";
        await this.markDeliveryFailed(offerId, tokenHash, reason);
        results.push({
          userId: candidate.userId,
          email: candidate.email,
          status: "failed",
          reason,
        });
        continue;
      }
      results.push({
        userId: candidate.userId,
        email: candidate.email,
        status: delivery.delayMs > 0 ? "scheduled" : "queued",
        ...(delivery.delayMs > 0
          ? { scheduledFor: delivery.scheduledFor! }
          : {}),
      });
    }

    return {
      campaignKey: key,
      queued: results.filter((result) => result.status === "queued").length,
      scheduled: results.filter((result) => result.status === "scheduled")
        .length,
      failed: results.filter((result) => result.status === "failed").length,
      excluded,
      results,
    };
  }

  async deliverQueuedOffer(job: RecoveryOfferDeliveryJob) {
    const tokenHash = this.hashToken(job.rawToken);
    const offer = await this.prisma.recoveryOffer.findUnique({
      where: { id: job.offerId },
      include: {
        user: { select: { firstName: true } },
        shop: { select: { shopName: true } },
      },
    });
    if (
      !offer ||
      offer.status !== RecoveryOfferStatus.PREPARED ||
      offer.tokenHash !== tokenHash
    ) {
      return { skipped: true };
    }

    const appUrl = (
      this.config.get<string>("FRONTEND_URL") ||
      this.config.get<string>("APP_URL") ||
      "https://www.orivraa.com"
    ).replace(/\/$/, "");
    const claimUrl = `${appUrl}/recovery/pro#token=${encodeURIComponent(job.rawToken)}`;
    const delivery = await this.mail.send({
      to: offer.email,
      subject: "We let you down — 40 days of Orivraa Pro on us",
      template: "recovery-offer",
      from: `Aakash from Orivraa <${EMAIL_SENDERS.SUPPORT}>`,
      replyTo: EMAIL_SENDERS.SUPPORT,
      idempotencyKey: `recovery-offer/${offer.id}/${tokenHash}`,
      context: {
        firstName: offer.user.firstName || "there",
        shopName: offer.shop.shopName,
        days: offer.days,
        claimUrl,
        offerExpiresAt: offer.expiresAt,
      },
    });
    if (!delivery.success) {
      throw new Error(delivery.error || "Email delivery failed");
    }

    await this.prisma.$transaction(async (tx) => {
      const sent = await tx.recoveryOffer.updateMany({
        where: {
          id: offer.id,
          status: RecoveryOfferStatus.PREPARED,
          tokenHash,
        },
        data: {
          status: RecoveryOfferStatus.SENT,
          sentAt: new Date(),
          deliveryMessageId: delivery.messageId,
        },
      });
      if (sent.count !== 1) return;
      await tx.emailLog.create({
        data: {
          direction: "OUTBOUND",
          fromAddress: `Aakash from Orivraa <${EMAIL_SENDERS.SUPPORT}>`,
          toAddress: offer.email,
          subject: "We let you down — 40 days of Orivraa Pro on us",
          body: `Service recovery offer: ${offer.days} days of PRO; no card or automatic renewal.`,
          userId: offer.userId,
          adminId: offer.createdBy,
          messageId: delivery.messageId,
          templateKey: "recovery_offer",
          threadId: offer.id,
        },
      });
    });
    return { skipped: false };
  }

  async markDeliveryFailed(offerId: string, tokenHash: string, reason: string) {
    await this.prisma.recoveryOffer.updateMany({
      where: { id: offerId, status: RecoveryOfferStatus.PREPARED, tokenHash },
      data: {
        status: RecoveryOfferStatus.SEND_FAILED,
        failureReason: reason.slice(0, 2000),
      },
    });
  }

  async lookup(rawToken: string) {
    const offer = await this.prisma.recoveryOffer.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      select: {
        id: true,
        email: true,
        days: true,
        status: true,
        expiresAt: true,
        claimedAt: true,
      },
    });
    if (!offer) throw new NotFoundException("Recovery offer not found");

    const expired =
      offer.expiresAt.getTime() <= Date.now() &&
      offer.status !== RecoveryOfferStatus.CLAIMED;
    if (expired && offer.status !== RecoveryOfferStatus.EXPIRED) {
      await this.prisma.recoveryOffer.update({
        where: { id: offer.id },
        data: { status: RecoveryOfferStatus.EXPIRED },
      });
    }

    return {
      recipient: this.maskEmail(offer.email),
      days: offer.days,
      status: expired ? RecoveryOfferStatus.EXPIRED : offer.status,
      expiresAt: offer.expiresAt,
      claimedAt: offer.claimedAt,
      claimable: !expired && offer.status === RecoveryOfferStatus.SENT,
    };
  }

  async claim(rawToken: string, userId: string) {
    const tokenHash = this.hashToken(rawToken);

    return this.prisma.$transaction(
      async (tx) => {
        const offer = await tx.recoveryOffer.findUnique({
          where: { tokenHash },
        });
        if (!offer) throw new NotFoundException("Recovery offer not found");
        if (offer.userId !== userId) {
          throw new ForbiddenException(
            "Sign in with the account that received this recovery offer",
          );
        }
        if (offer.status === RecoveryOfferStatus.CLAIMED) {
          return {
            claimed: true,
            alreadyClaimed: true,
            days: offer.days,
            claimedAt: offer.claimedAt,
            subscriptionId: offer.grantedSubscriptionId,
          };
        }
        if (offer.expiresAt.getTime() <= Date.now()) {
          throw new BadRequestException("This recovery offer has expired");
        }
        if (offer.status !== RecoveryOfferStatus.SENT) {
          throw new BadRequestException(
            "This recovery offer cannot be claimed",
          );
        }

        const locked = await tx.recoveryOffer.updateMany({
          where: {
            id: offer.id,
            status: RecoveryOfferStatus.SENT,
            claimedAt: null,
          },
          data: { status: RecoveryOfferStatus.CLAIMING },
        });
        if (locked.count !== 1) {
          throw new BadRequestException(
            "This recovery offer is already being claimed",
          );
        }

        const subscription = await this.grantEntitlement(tx, offer);
        const claimedAt = new Date();
        await tx.recoveryOffer.update({
          where: { id: offer.id },
          data: {
            status: RecoveryOfferStatus.CLAIMED,
            claimedAt,
            grantedSubscriptionId: subscription.id,
          },
        });

        return {
          claimed: true,
          alreadyClaimed: false,
          days: offer.days,
          claimedAt,
          subscriptionId: subscription.id,
          currentPeriodEnd: subscription.currentPeriodEnd,
          planName: subscription.plan.name,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  listRecent() {
    return this.prisma.recoveryOffer.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        campaignKey: true,
        email: true,
        days: true,
        status: true,
        sourceReportIds: true,
        expiresAt: true,
        sentAt: true,
        scheduledFor: true,
        claimedAt: true,
        createdAt: true,
      },
    });
  }

  private async resolveCandidates(reportIds: string[], campaignKey: string) {
    const uniqueReportIds = [
      ...new Set(reportIds.filter((id) => typeof id === "string" && id.trim())),
    ];
    if (uniqueReportIds.length === 0 || uniqueReportIds.length > 100) {
      throw new BadRequestException("Select between 1 and 100 crash reports");
    }

    const reports = await this.prisma.crashReport.findMany({
      where: { id: { in: uniqueReportIds } },
      select: { id: true, userId: true },
    });
    const reportIdsByUser = new Map<string, string[]>();
    let reportsWithoutUser = 0;
    for (const report of reports) {
      if (!report.userId) {
        reportsWithoutUser += 1;
        continue;
      }
      reportIdsByUser.set(report.userId, [
        ...(reportIdsByUser.get(report.userId) || []),
        report.id,
      ]);
    }

    const now = new Date();
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...reportIdsByUser.keys()] } },
      include: {
        recoveryOffers: { where: { campaignKey } },
        shops: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          include: {
            subscriptions: {
              where: {
                OR: [
                  {
                    status: {
                      in: [
                        SubscriptionStatus.ACTIVE,
                        SubscriptionStatus.TRIALING,
                        SubscriptionStatus.PAST_DUE,
                      ],
                    },
                  },
                  {
                    status: SubscriptionStatus.CANCELLED,
                    currentPeriodEnd: { gt: now },
                  },
                ],
              },
              include: { plan: true },
              orderBy: { currentPeriodEnd: "desc" },
            },
          },
        },
      },
    });
    const proPlans = await this.prisma.subscriptionPlan.findMany({
      where: { name: "PRO", isActive: true },
      select: { country: true },
    });
    const proCountries = new Set(proPlans.map((plan) => plan.country));
    const candidates: Candidate[] = [];
    const excluded: Exclusion[] = [];

    if (reportsWithoutUser > 0) {
      excluded.push({
        reason: `${reportsWithoutUser} selected report(s) are not linked to a signed-in user`,
      });
    }
    if (reports.length !== uniqueReportIds.length) {
      excluded.push({
        reason: `${uniqueReportIds.length - reports.length} selected report(s) were not found`,
      });
    }

    for (const user of users) {
      if (user.role !== UserRole.SHOPKEEPER) {
        excluded.push({
          userId: user.id,
          email: user.email,
          reason: "Only shopkeeper accounts can receive PRO",
        });
        continue;
      }
      if (!user.emailVerified) {
        excluded.push({
          userId: user.id,
          email: user.email,
          reason: "Email address is not verified",
        });
        continue;
      }

      const shop =
        user.shops.find((candidate) => candidate.id === user.activeShopId) ||
        user.shops[0];
      if (!shop) {
        excluded.push({
          userId: user.id,
          email: user.email,
          reason: "No active shop is attached to this account",
        });
        continue;
      }

      const existingOffer = user.recoveryOffers.find(
        (offer) => offer.shopId === shop.id,
      );
      if (
        existingOffer &&
        existingOffer.status !== RecoveryOfferStatus.SEND_FAILED
      ) {
        excluded.push({
          userId: user.id,
          email: user.email,
          reason:
            existingOffer.status === RecoveryOfferStatus.CLAIMED
              ? "Recovery offer was already claimed"
              : existingOffer.status === RecoveryOfferStatus.SENT
                ? "Recovery offer was already sent"
                : existingOffer.status === RecoveryOfferStatus.EXPIRED
                  ? "Recovery offer expired unclaimed"
                  : "Recovery offer is already being processed",
        });
        continue;
      }

      const blockingPaidSubscription = shop.subscriptions.find(
        (subscription) =>
          subscription.plan.name !== "FREE" &&
          subscription.status !== SubscriptionStatus.TRIALING,
      );
      if (blockingPaidSubscription) {
        excluded.push({
          userId: user.id,
          email: user.email,
          reason: "Account already has an active paid plan",
        });
        continue;
      }

      const country = shop.country as MarketRegion;
      if (!proCountries.has(country)) {
        excluded.push({
          userId: user.id,
          email: user.email,
          reason: `No active PRO plan is configured for ${shop.country}`,
        });
        continue;
      }

      candidates.push({
        userId: user.id,
        shopId: shop.id,
        email: user.email,
        firstName: user.firstName || "there",
        shopName: shop.shopName,
        country,
        reportIds: reportIdsByUser.get(user.id) || [],
      });
    }

    return { candidates, excluded };
  }

  private async grantEntitlement(
    tx: Prisma.TransactionClient,
    offer: {
      userId: string;
      shopId: string;
      days: number;
    },
  ) {
    const now = new Date();
    const shop = await tx.shop.findFirst({
      where: { id: offer.shopId, userId: offer.userId, isActive: true },
    });
    if (!shop) throw new BadRequestException("The linked shop is unavailable");

    const currentSubscriptions = await tx.sellerSubscription.findMany({
      where: {
        shopId: shop.id,
        OR: [
          {
            status: {
              in: [
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.TRIALING,
                SubscriptionStatus.PAST_DUE,
              ],
            },
          },
          {
            status: SubscriptionStatus.CANCELLED,
            currentPeriodEnd: { gt: now },
          },
        ],
      },
      include: { plan: true },
      orderBy: { currentPeriodEnd: "desc" },
    });

    const blockingPaidSubscription = currentSubscriptions.find(
      (subscription) =>
        subscription.plan.name !== "FREE" &&
        subscription.status !== SubscriptionStatus.TRIALING,
    );
    if (blockingPaidSubscription) {
      throw new BadRequestException(
        "Your account already has a paid plan. Reply to the recovery email so we can apply the credit manually.",
      );
    }

    const currentTrial = currentSubscriptions.find(
      (subscription) =>
        subscription.status === SubscriptionStatus.TRIALING &&
        subscription.plan.name !== "FREE",
    );
    if (currentTrial) {
      const base =
        currentTrial.currentPeriodEnd.getTime() > now.getTime()
          ? currentTrial.currentPeriodEnd
          : now;
      const currentPeriodEnd = new Date(base.getTime() + offer.days * DAY_MS);
      return tx.sellerSubscription.update({
        where: { id: currentTrial.id },
        data: { currentPeriodEnd, expiresAt: currentPeriodEnd },
        include: { plan: true },
      });
    }

    await tx.sellerSubscription.updateMany({
      where: {
        shopId: shop.id,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
        plan: { name: "FREE" },
      },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: now,
        cancelReason: "Upgraded by service-recovery offer",
      },
    });

    const proPlan = await tx.subscriptionPlan.findFirst({
      where: {
        name: "PRO",
        country: shop.country as MarketRegion,
        isActive: true,
      },
    });
    if (!proPlan) {
      throw new BadRequestException(
        `No active PRO plan is configured for ${shop.country}`,
      );
    }

    const currentPeriodEnd = new Date(now.getTime() + offer.days * DAY_MS);
    return tx.sellerSubscription.create({
      data: {
        shopId: shop.id,
        planId: proPlan.id,
        status: SubscriptionStatus.TRIALING,
        country: proPlan.country,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd,
        expiresAt: currentPeriodEnd,
        autoRenew: false,
      },
      include: { plan: true },
    });
  }

  private normalizeCampaignKey(value?: string) {
    const key = (value || DEFAULT_CAMPAIGN_KEY).trim();
    if (!/^[a-z0-9][a-z0-9_-]{2,79}$/i.test(key)) {
      throw new BadRequestException("Invalid recovery campaign key");
    }
    return key;
  }

  private resolveDelivery(
    country: MarketRegion,
    deliveryTiming: RecoveryOfferDeliveryTiming | undefined,
  ) {
    if (deliveryTiming !== "NEXT_LOCAL_10AM") {
      return { scheduledFor: null, delayMs: 0 };
    }

    const timeZone = LOCAL_TEN_AM_TIME_ZONES[country];
    if (!timeZone) return null;

    const scheduledFor = new CronTime("0 0 10 * * *", timeZone)
      .sendAt()
      .toJSDate();
    return {
      scheduledFor,
      delayMs: Math.max(0, scheduledFor.getTime() - Date.now()),
    };
  }

  private hashToken(rawToken: string) {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  private maskEmail(email: string) {
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
  }
}
