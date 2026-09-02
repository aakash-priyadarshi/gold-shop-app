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
  UserStatus,
  CurrencyCode,
} from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { CronTime } from "cron";
import type { WebhookEventPayload } from "resend";
import { PrismaService } from "../../prisma/prisma.service";
import { EMAIL_SENDERS, MailService } from "../mail/mail.service";
import { RecoveryOfferDeliveryTiming } from "./dto/recovery-offer.dto";

const DEFAULT_INCIDENT_CAMPAIGN_KEY = "incident-recovery-2026-08";
const DEFAULT_AUDIENCE_CAMPAIGN_KEY = "customer-winback-2026-09";
const RECOVERY_DAYS = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
export const RECOVERY_OFFERS_QUEUE = "recovery-offers";
export const DELIVER_RECOVERY_OFFER_JOB = "deliver";

const LOCAL_TEN_AM_TIME_ZONES: Partial<Record<MarketRegion, string>> = {
  IN: "Asia/Kolkata",
  NP: "Asia/Kathmandu",
  AE: "Asia/Dubai",
  UK: "Europe/London",
  EU: "Europe/Paris",
  US: "America/New_York",
  LK: "Asia/Colombo",
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
  lastActiveAt: Date | null;
  activitySegment: "recent" | "dormant" | "lapsed";
  incidentAffected: boolean;
  emailVerified: boolean;
  hasPaidPlan: boolean;
  accountStatus: UserStatus;
  offerStatus: RecoveryOfferStatus | null;
  phone: string | null;
  preferredCurrency: string;
};

type RecoveryGrantOutcome = "activated" | "extended" | "already_covered";

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
    const key = this.normalizeCampaignKey(
      campaignKey,
      DEFAULT_INCIDENT_CAMPAIGN_KEY,
    );
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
        emailVerified: candidate.emailVerified,
        hasPaidPlan: candidate.hasPaidPlan,
        hasShop: Boolean(candidate.shopId),
        accountStatus: candidate.accountStatus,
        offerStatus: candidate.offerStatus,
      })),
      excluded,
    };
  }

  async previewAudience(campaignKey?: string) {
    const key = this.normalizeCampaignKey(
      campaignKey,
      DEFAULT_AUDIENCE_CAMPAIGN_KEY,
    );
    const { candidates, excluded, totalAccounts } =
      await this.resolveAudienceCandidates(undefined, key);

    return {
      campaignKey: key,
      days: RECOVERY_DAYS,
      totalAccounts,
      eligible: candidates.map((candidate) => {
        const delivery = this.resolveDelivery(
          candidate.country,
          "NEXT_LOCAL_10AM",
        );
        return {
          userId: candidate.userId,
          shopId: candidate.shopId,
          email: candidate.email,
          firstName: candidate.firstName,
          shopName: candidate.shopName,
          country: candidate.country,
          lastActiveAt: candidate.lastActiveAt,
          activitySegment: candidate.activitySegment,
          incidentAffected: candidate.incidentAffected,
          timeZone: LOCAL_TEN_AM_TIME_ZONES[candidate.country] || "UTC",
          recommendedSendAt: delivery?.scheduledFor || null,
          emailVerified: candidate.emailVerified,
          hasPaidPlan: candidate.hasPaidPlan,
          hasShop: Boolean(candidate.shopId),
          accountStatus: candidate.accountStatus,
          offerStatus: candidate.offerStatus,
        };
      }),
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

    const key = this.normalizeCampaignKey(
      input.campaignKey,
      DEFAULT_INCIDENT_CAMPAIGN_KEY,
    );
    const expiresInDays = input.expiresInDays ?? 30;
    const { candidates, excluded } = await this.resolveCandidates(
      input.reportIds,
      key,
    );

    return this.queueCandidates({
      candidates,
      excluded,
      campaignKey: key,
      expiresInDays,
      deliveryTiming: input.deliveryTiming,
      adminId: input.adminId,
    });
  }

  async sendAudience(input: {
    userIds: string[];
    campaignKey?: string;
    expiresInDays?: number;
    deliveryTiming?: RecoveryOfferDeliveryTiming;
    scheduledFor?: string;
    recipientSchedules?: Array<{ userId: string; scheduledAt: string }>;
    confirmed: boolean;
    adminId: string;
  }) {
    if (!input.confirmed) {
      throw new BadRequestException(
        "Preview and confirm the recovery recipients before sending",
      );
    }

    const userIds = [
      ...new Set(
        input.userIds.filter((id) => typeof id === "string" && id.trim()),
      ),
    ];
    if (userIds.length === 0 || userIds.length > 250) {
      throw new BadRequestException("Select between 1 and 250 recipients");
    }

    const key = this.normalizeCampaignKey(
      input.campaignKey,
      DEFAULT_AUDIENCE_CAMPAIGN_KEY,
    );
    const { candidates, excluded } = await this.resolveAudienceCandidates(
      userIds,
      key,
    );

    const scheduledFor = this.parseScheduleInstant(input.scheduledFor);
    if (input.deliveryTiming === "CUSTOM" && !scheduledFor) {
      throw new BadRequestException(
        "Choose a send time when using a custom recovery schedule",
      );
    }
    const scheduledForByUserId = new Map<string, Date>();
    for (const item of input.recipientSchedules || []) {
      const when = this.parseScheduleInstant(item.scheduledAt);
      if (item.userId && when) scheduledForByUserId.set(item.userId, when);
    }

    return this.queueCandidates({
      candidates,
      excluded,
      campaignKey: key,
      expiresInDays: input.expiresInDays ?? 30,
      deliveryTiming: input.deliveryTiming,
      scheduledFor,
      scheduledForByUserId,
      adminId: input.adminId,
    });
  }

  private async queueCandidates(input: {
    candidates: Candidate[];
    excluded: Exclusion[];
    campaignKey: string;
    expiresInDays: number;
    deliveryTiming?: RecoveryOfferDeliveryTiming;
    scheduledFor?: Date | null;
    scheduledForByUserId?: Map<string, Date>;
    adminId: string;
  }) {
    const { candidates, excluded } = input;
    const results: Array<{
      userId: string;
      email: string;
      status: "queued" | "scheduled" | "failed";
      reason?: string;
      scheduledFor?: Date;
    }> = [];

    for (const candidate of candidates) {
      const ready = await this.ensureShopForOffer(candidate);
      const delivery = this.resolveDelivery(
        ready.country,
        input.deliveryTiming,
        input.scheduledForByUserId?.get(ready.userId) || input.scheduledFor,
      );
      if (!delivery) {
        excluded.push({
          userId: ready.userId,
          email: ready.email,
          reason: `A local 10:00 AM delivery time is not configured for ${ready.country}`,
        });
        continue;
      }
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = this.hashToken(rawToken);
      const startsAt = delivery.scheduledFor || new Date();
      const expiresAt = new Date(
        startsAt.getTime() + input.expiresInDays * DAY_MS,
      );
      let offerId: string | null = null;
      const existing = await this.prisma.recoveryOffer.findUnique({
        where: {
          campaignKey_shopId: {
            campaignKey: input.campaignKey,
            shopId: ready.shopId,
          },
        },
        select: { id: true, status: true },
      });

      const offerData = {
        email: ready.email,
        tokenHash,
        sourceReportIds: ready.reportIds,
        expiresAt,
        scheduledFor: delivery.scheduledFor,
        status: RecoveryOfferStatus.PREPARED,
        failureReason: null,
        days: RECOVERY_DAYS,
        createdBy: input.adminId,
      };

      if (existing) {
        if (
          existing.status === RecoveryOfferStatus.CLAIMED ||
          existing.status === RecoveryOfferStatus.CLAIMING
        ) {
          excluded.push({
            userId: ready.userId,
            email: ready.email,
            reason:
              existing.status === RecoveryOfferStatus.CLAIMED
                ? "Recovery offer was already claimed"
                : "Recovery offer is already being claimed",
          });
          continue;
        }
        await this.prisma.recoveryOffer.update({
          where: { id: existing.id },
          data: offerData,
        });
        offerId = existing.id;
      } else {
        try {
          const created = await this.prisma.recoveryOffer.create({
            data: {
              campaignKey: input.campaignKey,
              userId: ready.userId,
              shopId: ready.shopId,
              ...offerData,
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
          userId: ready.userId,
          email: ready.email,
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
          userId: ready.userId,
          email: ready.email,
          status: "failed",
          reason,
        });
        continue;
      }
      results.push({
        userId: ready.userId,
        email: ready.email,
        status: delivery.delayMs > 0 ? "scheduled" : "queued",
        ...(delivery.delayMs > 0
          ? { scheduledFor: delivery.scheduledFor! }
          : {}),
      });
    }

    return {
      campaignKey: input.campaignKey,
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
    const subject = `We’re sorry about the invoice issue — ${offer.days} days of Orivraa Pro on us`;
    const delivery = await this.mail.send({
      to: offer.email,
      subject,
      template: "recovery-offer",
      from: `Aakash from Orivraa <${EMAIL_SENDERS.SUPPORT}>`,
      replyTo: EMAIL_SENDERS.SUPPORT,
      idempotencyKey: `recovery-offer/${offer.id}/${tokenHash}`,
      tags: [
        { name: "category", value: "recovery_offer" },
        { name: "offer_id", value: offer.id },
        { name: "campaign", value: offer.campaignKey },
      ],
      context: {
        firstName: offer.user.firstName || "there",
        shopName: offer.shop.shopName,
        days: offer.days,
        claimUrl,
        offerExpiresAt: offer.expiresAt,
        brandIconUrl: `${appUrl}/favicon/android-chrome-192x192.png`,
        heroImageUrl: `${appUrl}/luxury-gold-globe.png`,
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
          subject,
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

  async recordResendEvent(webhookId: string, event: WebhookEventPayload) {
    if (
      ![
        "email.delivered",
        "email.opened",
        "email.clicked",
        "email.bounced",
        "email.complained",
        "email.failed",
        "email.suppressed",
      ].includes(event.type)
    ) {
      return { processed: false, reason: "Event is not used by recovery metrics" };
    }

    const emailEvent = event as Extract<
      WebhookEventPayload,
      {
        type:
          | "email.delivered"
          | "email.opened"
          | "email.clicked"
          | "email.bounced"
          | "email.complained"
          | "email.failed"
          | "email.suppressed";
      }
    >;
    const eventAt = new Date(
      emailEvent.type === "email.clicked"
        ? emailEvent.data.click.timestamp
        : emailEvent.created_at,
    );
    if (Number.isNaN(eventAt.getTime())) {
      throw new BadRequestException("Resend webhook timestamp is invalid");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const duplicate = await tx.recoveryOfferEmailEvent.findUnique({
          where: { webhookId },
          select: { id: true },
        });
        if (duplicate) return { processed: false, duplicate: true };

        const taggedOfferId = emailEvent.data.tags?.offer_id;
        const offer = taggedOfferId
          ? await tx.recoveryOffer.findFirst({
              where: {
                id: taggedOfferId,
                OR: [
                  { deliveryMessageId: emailEvent.data.email_id },
                  { deliveryMessageId: null },
                ],
              },
            })
          : await tx.recoveryOffer.findFirst({
              where: { deliveryMessageId: emailEvent.data.email_id },
            });

        if (
          !offer ||
          !emailEvent.data.to.some(
            (recipient) =>
              recipient.trim().toLowerCase() === offer.email.toLowerCase(),
          )
        ) {
          return { processed: false, reason: "Recovery offer was not found" };
        }

        const earlier = (current: Date | null, incoming: Date) =>
          !current || incoming.getTime() < current.getTime() ? incoming : current;
        const later = (current: Date | null, incoming: Date) =>
          !current || incoming.getTime() > current.getTime() ? incoming : current;
        const update: Prisma.RecoveryOfferUpdateInput = {
          ...(offer.deliveryMessageId
            ? {}
            : { deliveryMessageId: emailEvent.data.email_id }),
        };
        let linkKind: string | null = null;

        switch (emailEvent.type) {
          case "email.delivered":
            update.deliveredAt = earlier(offer.deliveredAt, eventAt);
            break;
          case "email.opened":
            update.firstOpenedAt = earlier(offer.firstOpenedAt, eventAt);
            update.lastOpenedAt = later(offer.lastOpenedAt, eventAt);
            update.openCount = { increment: 1 };
            break;
          case "email.clicked": {
            update.firstClickedAt = earlier(offer.firstClickedAt, eventAt);
            update.lastClickedAt = later(offer.lastClickedAt, eventAt);
            update.clickCount = { increment: 1 };
            const safeDestination = emailEvent.data.click.link.split("#", 1)[0];
            linkKind = safeDestination.includes("/recovery/pro")
              ? "claim"
              : "other";
            break;
          }
          case "email.bounced":
            update.bouncedAt = earlier(offer.bouncedAt, eventAt);
            break;
          case "email.complained":
            update.complainedAt = earlier(offer.complainedAt, eventAt);
            break;
          case "email.failed":
            update.failedAt = earlier(offer.failedAt, eventAt);
            break;
          case "email.suppressed":
            update.suppressedAt = earlier(offer.suppressedAt, eventAt);
            break;
        }

        await tx.recoveryOfferEmailEvent.create({
          data: {
            webhookId,
            offerId: offer.id,
            type: emailEvent.type,
            eventAt,
            linkKind,
          },
        });
        await tx.recoveryOffer.update({
          where: { id: offer.id },
          data: update,
        });
        return { processed: true, offerId: offer.id, type: emailEvent.type };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { processed: false, duplicate: true };
      }
      throw error;
    }
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
        user: { select: { emailVerified: true } },
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
      requiresEmailVerification: offer.user?.emailVerified === false,
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

        const claimant = await tx.user.findUnique({
          where: { id: userId },
          select: { emailVerified: true, status: true },
        });
        if (
          claimant?.status === UserStatus.SUSPENDED ||
          claimant?.status === UserStatus.DEACTIVATED
        ) {
          throw new ForbiddenException(
            "This account cannot claim the recovery offer",
          );
        }
        if (!claimant?.emailVerified) {
          throw new ForbiddenException(
            "Verify your email before activating this offer. Sign in to receive a verification code, then return to this page.",
          );
        }
        if (claimant?.status === UserStatus.PENDING_VERIFICATION) {
          await tx.user.update({
            where: { id: userId },
            data: { status: UserStatus.ACTIVE },
          });
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

        const { subscription, outcome } = await this.grantEntitlement(
          tx,
          offer,
        );
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
          outcome,
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
        deliveredAt: true,
        firstOpenedAt: true,
        openCount: true,
        firstClickedAt: true,
        clickCount: true,
        bouncedAt: true,
        complainedAt: true,
        scheduledFor: true,
        claimedAt: true,
        createdAt: true,
      },
    });
  }

  async getCampaignMetrics(campaignKey?: string) {
    const key = this.normalizeCampaignKey(
      campaignKey,
      DEFAULT_AUDIENCE_CAMPAIGN_KEY,
    );
    const offers = await this.prisma.recoveryOffer.findMany({
      where: { campaignKey: key },
      include: {
        user: {
          select: {
            lastLoginAt: true,
            webSessions: {
              select: { startedAt: true },
              orderBy: { startedAt: "desc" },
              take: 1,
            },
            desktopSessions: {
              select: { startedAt: true },
              orderBy: { startedAt: "desc" },
              take: 1,
            },
          },
        },
        shop: { select: { country: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const withReturnStatus = offers.map((offer) => {
      const activityCandidates = [
        offer.claimedAt,
        offer.user.lastLoginAt,
        offer.user.webSessions[0]?.startedAt,
        offer.user.desktopSessions[0]?.startedAt,
      ].filter(
        (value): value is Date =>
          value instanceof Date &&
          Boolean(offer.sentAt) &&
          value.getTime() > offer.sentAt!.getTime(),
      );
      const rejoinedAt =
        activityCandidates.sort((a, b) => a.getTime() - b.getTime())[0] || null;
      return { ...offer, rejoinedAt };
    });

    const count = (
      predicate: (offer: (typeof withReturnStatus)[number]) => boolean,
      values = withReturnStatus,
    ) => values.filter(predicate).length;
    const rate = (numerator: number, denominator: number) =>
      denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
    const totals = {
      targeted: offers.length,
      scheduled: count(
        (offer) =>
          offer.status === RecoveryOfferStatus.PREPARED &&
          Boolean(offer.scheduledFor),
      ),
      sent: count((offer) => Boolean(offer.sentAt)),
      delivered: count((offer) => Boolean(offer.deliveredAt)),
      opened: count((offer) => Boolean(offer.firstOpenedAt)),
      totalOpens: offers.reduce((sum, offer) => sum + offer.openCount, 0),
      clicked: count((offer) => Boolean(offer.firstClickedAt)),
      totalClicks: offers.reduce((sum, offer) => sum + offer.clickCount, 0),
      claimed: count((offer) => Boolean(offer.claimedAt)),
      rejoined: count((offer) => Boolean(offer.rejoinedAt)),
      bounced: count((offer) => Boolean(offer.bouncedAt)),
      complained: count((offer) => Boolean(offer.complainedAt)),
      failed: count(
        (offer) =>
          offer.status === RecoveryOfferStatus.SEND_FAILED ||
          Boolean(offer.failedAt) ||
          Boolean(offer.suppressedAt),
      ),
    };

    const countryCodes = [
      ...new Set(withReturnStatus.map((offer) => offer.shop.country)),
    ];
    const byCountry = countryCodes
      .map((country) => {
        const countryOffers = withReturnStatus.filter(
          (offer) => offer.shop.country === country,
        );
        const countryCount = (
          predicate: (offer: (typeof withReturnStatus)[number]) => boolean,
        ) => count(predicate, countryOffers);
        return {
          country,
          targeted: countryOffers.length,
          sent: countryCount((offer) => Boolean(offer.sentAt)),
          delivered: countryCount((offer) => Boolean(offer.deliveredAt)),
          opened: countryCount((offer) => Boolean(offer.firstOpenedAt)),
          clicked: countryCount((offer) => Boolean(offer.firstClickedAt)),
          claimed: countryCount((offer) => Boolean(offer.claimedAt)),
          rejoined: countryCount((offer) => Boolean(offer.rejoinedAt)),
        };
      })
      .sort((a, b) => b.targeted - a.targeted);

    return {
      campaignKey: key,
      totals,
      rates: {
        delivery: rate(totals.delivered, totals.sent),
        open: rate(totals.opened, totals.delivered),
        click: rate(totals.clicked, totals.delivered),
        claim: rate(totals.claimed, totals.delivered),
        rejoin: rate(totals.rejoined, totals.sent),
      },
      byCountry,
      webhookConfigured: Boolean(
        this.config.get<string>("RESEND_WEBHOOK_SECRET"),
      ),
      resendApiConfigured: Boolean(this.config.get<string>("RESEND_API_KEY")),
      updatedAt: new Date(),
    };
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

    const resolved = await this.resolveUsers(
      [...reportIdsByUser.keys()],
      campaignKey,
      reportIdsByUser,
    );
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

    return {
      candidates: resolved.candidates,
      excluded: [...excluded, ...resolved.excluded],
    };
  }

  private async resolveAudienceCandidates(
    userIds: string[] | undefined,
    campaignKey: string,
  ) {
    const uniqueUserIds = userIds
      ? [...new Set(userIds.filter((id) => id.trim()))]
      : undefined;
    const resolved = await this.resolveUsers(
      uniqueUserIds,
      campaignKey,
      new Map(),
      true,
    );

    if (uniqueUserIds && resolved.totalAccounts !== uniqueUserIds.length) {
      resolved.excluded.unshift({
        reason: `${uniqueUserIds.length - resolved.totalAccounts} selected account(s) were not found`,
      });
    }
    return resolved;
  }

  private async resolveUsers(
    userIds: string[] | undefined,
    campaignKey: string,
    reportIdsByUser: Map<string, string[]>,
    discoverInvoiceReports = false,
  ) {
    const now = new Date();
    const users = await this.prisma.user.findMany({
      where: userIds ? { id: { in: userIds } } : { role: UserRole.SHOPKEEPER },
      include: {
        recoveryOffers: { where: { campaignKey } },
        webSessions: {
          select: { lastActive: true },
          orderBy: { lastActive: "desc" },
          take: 1,
        },
        shops: {
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
      orderBy: { createdAt: "asc" },
    });

    if (discoverInvoiceReports && users.length > 0) {
      const invoiceReports = await this.prisma.crashReport.findMany({
        where: {
          userId: { in: users.map((user) => user.id) },
          OR: [
            { page: { contains: "invoice", mode: "insensitive" } },
            { errorMessage: { contains: "invoice", mode: "insensitive" } },
            { userAction: { contains: "invoice", mode: "insensitive" } },
            { userDescription: { contains: "invoice", mode: "insensitive" } },
          ],
        },
        select: { id: true, userId: true },
      });
      for (const report of invoiceReports) {
        if (!report.userId) continue;
        reportIdsByUser.set(report.userId, [
          ...(reportIdsByUser.get(report.userId) || []),
          report.id,
        ]);
      }
    }

    const proPlans = await this.prisma.subscriptionPlan.findMany({
      where: { name: "PRO", isActive: true },
      select: { country: true },
    });
    const proCountries = new Set(proPlans.map((plan) => plan.country));
    const candidates: Candidate[] = [];
    const excluded: Exclusion[] = [];

    for (const user of users) {
      if (user.role !== UserRole.SHOPKEEPER) {
        excluded.push({
          userId: user.id,
          email: user.email,
          reason: "Only shopkeeper accounts can receive PRO",
        });
        continue;
      }
      if (
        user.status === UserStatus.SUSPENDED ||
        user.status === UserStatus.DEACTIVATED
      ) {
        excluded.push({
          userId: user.id,
          email: user.email,
          reason: `Account status is ${user.status.toLowerCase().replace("_", " ")}`,
        });
        continue;
      }

      const shop =
        user.shops.find((candidate) => candidate.id === user.activeShopId) ||
        user.shops[0];
      const country = this.marketFromUser(user, shop?.country);
      if (!proCountries.has(country)) {
        excluded.push({
          userId: user.id,
          email: user.email,
          reason: `No active PRO plan is configured for ${country}`,
        });
        continue;
      }

      const existingOffer = shop
        ? user.recoveryOffers.find((offer) => offer.shopId === shop.id)
        : user.recoveryOffers[0];
      if (
        existingOffer &&
        (existingOffer.status === RecoveryOfferStatus.CLAIMED ||
          existingOffer.status === RecoveryOfferStatus.CLAIMING)
      ) {
        excluded.push({
          userId: user.id,
          email: user.email,
          reason:
            existingOffer.status === RecoveryOfferStatus.CLAIMED
              ? "Recovery offer was already claimed"
              : "Recovery offer is already being claimed",
        });
        continue;
      }

      const hasPaidPlan = Boolean(
        shop?.subscriptions.some(
          (subscription) => subscription.plan.name !== "FREE",
        ),
      );

      const lastActiveAt =
        [user.webSessions?.[0]?.lastActive, user.lastLoginAt]
          .filter((value): value is Date => value instanceof Date)
          .sort((a, b) => b.getTime() - a.getTime())[0] || null;
      const inactiveDays = lastActiveAt
        ? Math.floor((now.getTime() - lastActiveAt.getTime()) / DAY_MS)
        : Number.POSITIVE_INFINITY;
      const activitySegment =
        inactiveDays >= 60
          ? "lapsed"
          : inactiveDays >= 14
            ? "dormant"
            : "recent";
      const linkedReportIds = reportIdsByUser.get(user.id) || [];

      candidates.push({
        userId: user.id,
        shopId: shop?.id || "",
        email: user.email,
        firstName: user.firstName || "there",
        shopName: shop?.shopName || "No shop yet",
        country,
        reportIds: linkedReportIds,
        lastActiveAt,
        activitySegment,
        incidentAffected: linkedReportIds.length > 0,
        emailVerified: Boolean(user.emailVerified),
        hasPaidPlan,
        accountStatus: user.status || UserStatus.PENDING_VERIFICATION,
        offerStatus: existingOffer?.status || null,
        phone: user.phone || null,
        preferredCurrency: user.preferredCurrency || "USD",
      });
    }

    return { candidates, excluded, totalAccounts: users.length };
  }

  private async grantEntitlement(
    tx: Prisma.TransactionClient,
    offer: {
      userId: string;
      shopId: string;
      days: number;
    },
  ): Promise<{
    subscription: {
      id: string;
      currentPeriodEnd: Date;
      plan: { name: string };
    };
    outcome: RecoveryGrantOutcome;
  }> {
    const now = new Date();
    const targetEnd = new Date(now.getTime() + offer.days * DAY_MS);
    const shop = await tx.shop.findFirst({
      where: { id: offer.shopId, userId: offer.userId },
    });
    if (!shop) throw new BadRequestException("The linked shop is unavailable");
    if (!shop.isActive) {
      await tx.shop.update({
        where: { id: shop.id },
        data: { isActive: true },
      });
    }

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

    const existingPro = currentSubscriptions.find(
      (subscription) => subscription.plan.name !== "FREE",
    );
    if (existingPro) {
      if (existingPro.currentPeriodEnd.getTime() > targetEnd.getTime()) {
        return { subscription: existingPro, outcome: "already_covered" };
      }

      const subscription = await tx.sellerSubscription.update({
        where: { id: existingPro.id },
        data: { currentPeriodEnd: targetEnd, expiresAt: targetEnd },
        include: { plan: true },
      });
      return { subscription, outcome: "extended" };
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

    const subscription = await tx.sellerSubscription.create({
      data: {
        shopId: shop.id,
        planId: proPlan.id,
        status: SubscriptionStatus.TRIALING,
        country: proPlan.country,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: targetEnd,
        expiresAt: targetEnd,
        autoRenew: false,
      },
      include: { plan: true },
    });
    return { subscription, outcome: "activated" };
  }

  private normalizeCampaignKey(value: string | undefined, fallback: string) {
    const key = (value || fallback).trim();
    if (!/^[a-z0-9][a-z0-9_-]{2,79}$/i.test(key)) {
      throw new BadRequestException("Invalid recovery campaign key");
    }
    return key;
  }

  private resolveDelivery(
    country: MarketRegion,
    deliveryTiming: RecoveryOfferDeliveryTiming | undefined,
    scheduledAt?: Date | null,
  ) {
    if (scheduledAt) {
      return {
        scheduledFor: scheduledAt,
        delayMs: Math.max(0, scheduledAt.getTime() - Date.now()),
      };
    }
    if (deliveryTiming === "CUSTOM") return null;
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

  private async ensureShopForOffer(candidate: Candidate): Promise<Candidate> {
    if (candidate.shopId) return candidate;

    const created = await this.prisma.shop.create({
      data: {
        userId: candidate.userId,
        shopName:
          candidate.shopName && candidate.shopName !== "No shop yet"
            ? candidate.shopName
            : `${candidate.firstName}'s shop`,
        city: "Pending",
        address: "Pending",
        contactPhone: candidate.phone || "0000000000",
        contactEmail: candidate.email,
        country: candidate.country,
        currency: this.currencyForMarket(candidate),
      },
    });
    await this.prisma.user.update({
      where: { id: candidate.userId },
      data: { activeShopId: created.id },
    });
    return {
      ...candidate,
      shopId: created.id,
      shopName: created.shopName,
    };
  }

  private marketFromUser(
    user: { preferredCountry?: string | null },
    shopCountry?: string | null,
  ): MarketRegion {
    const raw = (shopCountry || user.preferredCountry || "US").toUpperCase();
    if (raw in LOCAL_TEN_AM_TIME_ZONES) return raw as MarketRegion;
    return "US";
  }

  private currencyForMarket(candidate: Candidate): CurrencyCode {
    const raw = candidate.preferredCurrency as CurrencyCode;
    if (Object.values(CurrencyCode).includes(raw)) return raw;
    const byMarket: Record<MarketRegion, CurrencyCode> = {
      IN: CurrencyCode.INR,
      NP: CurrencyCode.NPR,
      AE: CurrencyCode.AED,
      UK: CurrencyCode.GBP,
      EU: CurrencyCode.EUR,
      US: CurrencyCode.USD,
      LK: CurrencyCode.LKR,
    };
    return byMarket[candidate.country] ?? CurrencyCode.USD;
  }

  private parseScheduleInstant(value?: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("Invalid recovery send time");
    }
    return parsed;
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
