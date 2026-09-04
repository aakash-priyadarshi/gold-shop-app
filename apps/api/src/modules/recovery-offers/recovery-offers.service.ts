import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  MarketRegion,
  OfferCampaignKind,
  Prisma,
  RecoveryOfferStatus,
  SubscriptionStatus,
  UserRole,
  UserStatus,
  CurrencyCode,
} from "@prisma/client";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { CronTime } from "cron";
import type { WebhookEventPayload } from "resend";
import sharp from "sharp";
import { PrismaService } from "../../prisma/prisma.service";
import { EMAIL_SENDERS, MailService } from "../mail/mail.service";
import {
  OFFER_EMAIL_DESIGN_HTML_HARD_LIMIT_BYTES,
  OFFER_EMAIL_DESIGN_HTML_SOFT_LIMIT_BYTES,
  parseOfferEmailDesign,
  isValidOfferEmailDesign,
} from "./email-design";
import { EmailDesignRendererService } from "./email-design-renderer.service";
import { RecoveryOfferDeliveryTiming } from "./dto/recovery-offer.dto";
import type {
  CreateOfferCampaignDto,
  UpdateOfferCampaignEmailDto,
  UpdateOfferCampaignDto,
} from "./dto/recovery-offer.dto";

const DEFAULT_INCIDENT_CAMPAIGN_KEY = "incident-recovery-2026-08";
const DEFAULT_AUDIENCE_CAMPAIGN_KEY = "customer-winback-2026-09";
const RECOVERY_DAYS = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const OFFER_EMAIL_IMAGE_RETENTION_MS = 30 * DAY_MS;
export const OFFER_EMAIL_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const OFFER_EMAIL_IMAGE_MAX_PIXELS = 40_000_000;
// Email copy and artwork are locked this close to a scheduled send so the
// rendered emails cannot change while sends are already going out.
const EMAIL_EDIT_LOCK_MS = 5 * 60 * 1000;
const ALREADY_CONTACTED_STATUSES: RecoveryOfferStatus[] = [
  RecoveryOfferStatus.PREPARED,
  RecoveryOfferStatus.SENT,
  RecoveryOfferStatus.CLAIMING,
  RecoveryOfferStatus.CLAIMED,
];
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
  sentAt: Date | null;
  deliveredAt: Date | null;
  firstOpenedAt: Date | null;
  claimedAt: Date | null;
  openCount: number;
  clickCount: number;
  unsubscribed: boolean;
  canSend: boolean;
  cannotSendReason: string | null;
  phone: string | null;
  preferredCurrency: string;
};

type RecoveryGrantOutcome = "activated" | "extended" | "already_covered";

type ValidatedOfferEmailImage = {
  fileName: string;
  contentType: "image/png" | "image/jpeg" | "image/gif";
  content: Buffer;
};

type CampaignDefinition = {
  key: string;
  name: string;
  kind: OfferCampaignKind;
  complimentaryDays: number;
  discountPercent: number;
  startsAt: Date | null;
  endsAt: Date | null;
  emailSubject: string;
  emailHeading: string;
  emailBody: string;
  emailDesign?: unknown;
  imageUrl?: string | null;
  ctaUrl?: string | null;
  ctaLabel?: string | null;
  emailImage?: {
    id: string;
    fileName: string;
    contentType: string;
    byteSize: number;
    content: Buffer;
    expiresAt: Date;
  } | null;
};

type Exclusion = {
  userId?: string;
  email?: string;
  reason: string;
};

@Injectable()
export class RecoveryOffersService {
  private readonly logger = new Logger(RecoveryOffersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly emailDesignRenderer: EmailDesignRendererService,
    @InjectQueue(RECOVERY_OFFERS_QUEUE)
    private readonly queue: Queue<RecoveryOfferDeliveryJob>,
  ) {}

  async listCampaigns() {
    const [campaigns, scheduled] = await Promise.all([
      this.prisma.offerCampaign.findMany({
        orderBy: [{ isActive: "desc" }, { startsAt: "desc" }],
        include: {
          emailImage: {
            select: {
              id: true,
              fileName: true,
              contentType: true,
              byteSize: true,
              expiresAt: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.recoveryOffer.groupBy({
        by: ["campaignKey"],
        _min: { scheduledFor: true },
        where: {
          status: RecoveryOfferStatus.PREPARED,
          scheduledFor: { not: null },
        },
      }),
    ]);
    const nextScheduledByKey = new Map(
      scheduled.map((row) => [row.campaignKey, row._min.scheduledFor]),
    );
    const now = Date.now();
    return campaigns.map((campaign) => ({
      ...campaign,
      emailImage:
        campaign.emailImage && campaign.emailImage.expiresAt.getTime() > now
          ? campaign.emailImage
          : null,
      nextScheduledFor: nextScheduledByKey.get(campaign.key) ?? null,
    }));
  }

  async createCampaign(input: CreateOfferCampaignDto, adminId: string) {
    this.validateCampaignWindow(input);
    return this.prisma.offerCampaign.create({
      data: {
        ...input,
        key: this.normalizeCampaignKey(input.key, input.key),
        kind: input.kind as OfferCampaignKind,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        imageUrl: input.imageUrl?.trim() || null,
        ctaUrl: input.ctaUrl?.trim() || null,
        ctaLabel: input.ctaLabel?.trim() || null,
        createdBy: adminId,
      },
    });
  }

  async updateCampaign(key: string, input: UpdateOfferCampaignDto) {
    const resolvedKey = this.normalizeCampaignKey(key, key);
    const existing = await this.prisma.offerCampaign.findUnique({
      where: { key: resolvedKey },
    });
    if (!existing) {
      throw new NotFoundException("Offer campaign not found");
    }

    const emailContentTouched =
      input.emailSubject !== undefined ||
      input.emailHeading !== undefined ||
      input.emailBody !== undefined ||
      input.imageUrl !== undefined ||
      input.ctaUrl !== undefined ||
      input.ctaLabel !== undefined;
    if (emailContentTouched) {
      await this.assertEmailContentEditable(resolvedKey, this.prisma);
    }

    this.validateCampaignWindow({
      startsAt: input.startsAt ?? existing.startsAt.toISOString(),
      endsAt: input.endsAt ?? existing.endsAt.toISOString(),
      kind: input.kind ?? existing.kind,
      complimentaryDays:
        input.complimentaryDays ?? existing.complimentaryDays,
      discountPercent: input.discountPercent ?? existing.discountPercent,
      ctaUrl: input.ctaUrl !== undefined ? input.ctaUrl : existing.ctaUrl,
    });

    return this.prisma.offerCampaign.update({
      where: { key: resolvedKey },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.kind !== undefined
          ? { kind: input.kind as OfferCampaignKind }
          : {}),
        ...(input.complimentaryDays !== undefined
          ? { complimentaryDays: input.complimentaryDays }
          : {}),
        ...(input.discountPercent !== undefined
          ? { discountPercent: input.discountPercent }
          : {}),
        ...(input.startsAt !== undefined
          ? { startsAt: new Date(input.startsAt) }
          : {}),
        ...(input.endsAt !== undefined
          ? { endsAt: new Date(input.endsAt) }
          : {}),
        ...(input.emailSubject !== undefined
          ? { emailSubject: input.emailSubject }
          : {}),
        ...(input.emailHeading !== undefined
          ? { emailHeading: input.emailHeading }
          : {}),
        ...(input.emailBody !== undefined
          ? { emailBody: input.emailBody }
          : {}),
        ...(input.imageUrl !== undefined
          ? { imageUrl: input.imageUrl?.trim() || null }
          : {}),
        ...(input.ctaUrl !== undefined
          ? { ctaUrl: input.ctaUrl?.trim() || null }
          : {}),
        ...(input.ctaLabel !== undefined
          ? { ctaLabel: input.ctaLabel?.trim() || null }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async updateCampaignEmail(
    key: string,
    input: UpdateOfferCampaignEmailDto,
    file?: Express.Multer.File,
  ) {
    const resolvedKey = this.normalizeCampaignKey(key, key);
    const uploadedImage = await this.validateDraftImage(input, file);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.offerCampaign.findUnique({
        where: { key: resolvedKey },
      });
      if (!existing) {
        throw new NotFoundException("Offer campaign not found");
      }
      await this.assertEmailContentEditable(resolvedKey, tx);

      let emailImageId = existing.emailImageId;
      let imageUrl = existing.imageUrl;

      if (input.imageMode === "UPLOAD" && uploadedImage) {
        const stored = await tx.offerEmailImage.create({
          data: {
            fileName: uploadedImage.fileName,
            contentType: uploadedImage.contentType,
            byteSize: uploadedImage.content.length,
            content: uploadedImage.content,
            expiresAt: new Date(Date.now() + OFFER_EMAIL_IMAGE_RETENTION_MS),
          },
        });
        emailImageId = stored.id;
        imageUrl = null;
      } else if (input.imageMode === "URL") {
        emailImageId = null;
        imageUrl = input.imageUrl!.trim();
      } else if (input.imageMode === "DEFAULT") {
        emailImageId = null;
        imageUrl = null;
      }

      return tx.offerCampaign.update({
        where: { key: resolvedKey },
        data: {
          emailSubject: input.emailSubject,
          emailHeading: input.emailHeading,
          emailBody: input.emailBody,
          emailImageId,
          imageUrl,
          ...(input.ctaUrl !== undefined
            ? { ctaUrl: input.ctaUrl?.trim() || null }
            : {}),
          ...(input.ctaLabel !== undefined
            ? { ctaLabel: input.ctaLabel?.trim() || null }
            : {}),
        },
        include: {
          emailImage: {
            select: {
              id: true,
              fileName: true,
              contentType: true,
              byteSize: true,
              expiresAt: true,
              createdAt: true,
            },
          },
        },
      });
    });
  }

  async previewCampaignEmail(
    key: string,
    input: UpdateOfferCampaignEmailDto,
    file?: Express.Multer.File,
  ) {
    const campaign = await this.getCampaignDefinition(
      this.normalizeCampaignKey(key, key),
      { requireActive: false },
    );
    const uploadedImage = await this.validateDraftImage(input, file);
    const heroImageUrl = this.resolveDraftHeroImage(
      campaign,
      input,
      uploadedImage,
    );
    const appUrl = this.frontendBaseUrl();
    const isProductUpdate =
      campaign.kind === OfferCampaignKind.PRODUCT_UPDATE;
    const template = isProductUpdate
      ? "product-update"
      : campaign.kind === OfferCampaignKind.FESTIVAL
        ? "festival-offer"
        : "recovery-offer";
    const demoUrl =
      input.ctaUrl?.trim() ||
      campaign.ctaUrl ||
      `${appUrl}/jewellery-shop-software#ai-photo-studio`;
    const html = await this.mail.renderTemplate(template, {
      firstName: "Shop owner",
      shopName: "Your jewellery shop",
      days: campaign.complimentaryDays,
      claimUrl: isProductUpdate ? demoUrl : "#",
      demoUrl,
      catalogUrl: `${appUrl}/dashboard/shop/products`,
      ctaLabel:
        input.ctaLabel?.trim() || campaign.ctaLabel || "See it in action",
      unsubscribeUrl: "#",
      campaignName: campaign.name,
      emailSubject: input.emailSubject,
      emailHeading: input.emailHeading,
      emailBody: input.emailBody,
      discountPercent: campaign.discountPercent,
      saleStartsAt: campaign.startsAt || new Date(),
      saleEndsAt: campaign.endsAt || new Date(),
      pricingUrl: "#",
      brandIconUrl: `${appUrl}/favicon/android-chrome-192x192.png`,
      heroImageUrl,
    });

    return { subject: input.emailSubject, html };
  }

  /**
   * Saves a block-based design for a product-update campaign. The design is
   * parsed and normalized first, then size-checked against the rendered HTML
   * so an oversized email can never reach the queue. Festival and recovery
   * campaigns intentionally keep the simple editor.
   */
  async updateCampaignEmailDesign(
    key: string,
    input: { emailSubject: string; blocks: unknown[] },
  ) {
    const resolvedKey = this.normalizeCampaignKey(key, key);
    const design = this.parseDesignInput(input.blocks);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.offerCampaign.findUnique({
        where: { key: resolvedKey },
      });
      if (!existing) {
        throw new NotFoundException("Offer campaign not found");
      }
      if (existing.kind !== OfferCampaignKind.PRODUCT_UPDATE) {
        throw new BadRequestException(
          "Only product-update campaigns support the advanced email builder",
        );
      }
      await this.assertEmailContentEditable(resolvedKey, tx);

      const rendered = this.renderDesignOrThrow(
        design.blocks,
        existing.name,
        input.emailSubject,
      );
      if (rendered.bytes > OFFER_EMAIL_DESIGN_HTML_SOFT_LIMIT_BYTES) {
        this.logger.warn(
          `Campaign ${resolvedKey} email design renders at ${rendered.bytes} bytes (Gmail clips around 102 KB)`,
        );
      }

      return tx.offerCampaign.update({
        where: { key: resolvedKey },
        data: {
          emailSubject: input.emailSubject,
          emailDesign: design as unknown as Prisma.InputJsonValue,
        },
        include: {
          emailImage: {
            select: {
              id: true,
              fileName: true,
              contentType: true,
              byteSize: true,
              expiresAt: true,
              createdAt: true,
            },
          },
        },
      });
    });
  }

  /** Renders unsaved design blocks for the builder's live preview. */
  async previewCampaignEmailDesign(
    key: string,
    input: { emailSubject: string; blocks: unknown[] },
  ) {
    const resolvedKey = this.normalizeCampaignKey(key, key);
    const campaign = await this.prisma.offerCampaign.findUnique({
      where: { key: resolvedKey },
      select: { name: true, kind: true },
    });
    if (!campaign) {
      throw new NotFoundException("Offer campaign not found");
    }
    if (campaign.kind !== OfferCampaignKind.PRODUCT_UPDATE) {
      throw new BadRequestException(
        "Only product-update campaigns support the advanced email builder",
      );
    }
    const design = this.parseDesignInput(input.blocks);
    const rendered = this.renderDesignOrThrow(
      design.blocks,
      campaign.name,
      input.emailSubject,
      "Shop owner",
    );
    return {
      subject: input.emailSubject,
      html: rendered.html,
      bytes: rendered.bytes,
    };
  }

  /** Clears the design so the campaign falls back to the simple template path. */
  async clearCampaignEmailDesign(key: string) {
    const resolvedKey = this.normalizeCampaignKey(key, key);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.offerCampaign.findUnique({
        where: { key: resolvedKey },
      });
      if (!existing) {
        throw new NotFoundException("Offer campaign not found");
      }
      if (existing.kind !== OfferCampaignKind.PRODUCT_UPDATE) {
        throw new BadRequestException(
          "Only product-update campaigns support the advanced email builder",
        );
      }
      await this.assertEmailContentEditable(resolvedKey, tx);
      // DbNull stores a SQL NULL so the column keeps IS NULL semantics.
      return tx.offerCampaign.update({
        where: { key: resolvedKey },
        data: { emailDesign: Prisma.DbNull },
        include: {
          emailImage: {
            select: {
              id: true,
              fileName: true,
              contentType: true,
              byteSize: true,
              expiresAt: true,
              createdAt: true,
            },
          },
        },
      });
    });
  }

  /**
   * Delivery-time design rendering. A queued send must never fail because of
   * design size, so an oversized render falls back to the proven template
   * path (saves already enforce the hard limit; this is defense in depth).
   */
  private renderDesignForDelivery(
    design: import("./email-design").OfferEmailDesign,
    options: {
      campaignName: string;
      unsubscribeUrl: string;
      firstName: string;
      brandIconUrl: string;
    },
  ) {
    const rendered = this.emailDesignRenderer.render(design.blocks, options);
    if (rendered.bytes > OFFER_EMAIL_DESIGN_HTML_HARD_LIMIT_BYTES) {
      this.logger.error(
        `Campaign ${options.campaignName} email design renders at ${rendered.bytes} bytes; falling back to the template email`,
      );
      return null;
    }
    return rendered;
  }

  private parseDesignInput(blocks: unknown[]) {
    try {
      return parseOfferEmailDesign({ blocks });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "The email design contains an invalid block",
      );
    }
  }

  private renderDesignOrThrow(
    blocks: import("./email-design").OfferEmailBlock[],
    campaignName: string,
    subject: string,
    firstName?: string,
  ) {
    const rendered = this.emailDesignRenderer.render(blocks, {
      unsubscribeUrl: "#",
      campaignName,
      firstName,
      brandIconUrl: `${this.frontendBaseUrl()}/favicon/android-chrome-192x192.png`,
    });
    if (!subject || !campaignName) {
      throw new BadRequestException(
        "The email design needs a campaign name and subject",
      );
    }
    if (rendered.bytes > OFFER_EMAIL_DESIGN_HTML_HARD_LIMIT_BYTES) {
      throw new BadRequestException(
        "The rendered email is too large for Gmail (over 102 KB). Remove or shrink a few blocks.",
      );
    }
    return rendered;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpiredEmailImages() {
    const deleted = await this.prisma.offerEmailImage.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    if (deleted.count > 0) {
      this.logger.log(`Deleted ${deleted.count} expired offer email image(s)`);
    }
    return deleted.count;
  }

  async getPublicCampaign(key: string) {
    const campaign = await this.prisma.offerCampaign.findUnique({
      where: { key: this.normalizeCampaignKey(key, key) },
      select: {
        key: true,
        name: true,
        kind: true,
        complimentaryDays: true,
        discountPercent: true,
        startsAt: true,
        endsAt: true,
        emailHeading: true,
        emailBody: true,
        isActive: true,
      },
    });
    if (!campaign || !campaign.isActive) {
      throw new NotFoundException("Offer campaign not found");
    }
    return campaign;
  }

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
        sentAt: candidate.sentAt,
        deliveredAt: candidate.deliveredAt,
        firstOpenedAt: candidate.firstOpenedAt,
        claimedAt: candidate.claimedAt,
        openCount: candidate.openCount,
        clickCount: candidate.clickCount,
        unsubscribed: candidate.unsubscribed,
        canSend: candidate.canSend,
        cannotSendReason: candidate.cannotSendReason,
      })),
      excluded,
    };
  }

  async previewAudience(campaignKey?: string) {
    const key = this.normalizeCampaignKey(
      campaignKey,
      DEFAULT_AUDIENCE_CAMPAIGN_KEY,
    );
    const campaign = await this.getCampaignDefinition(key);
    const { candidates, excluded, totalAccounts } =
      await this.resolveAudienceCandidates(undefined, key, campaign.kind);
    const nearbyScheduled = await this.prisma.recoveryOffer.count({
      where: {
        campaignKey: { not: key },
        status: RecoveryOfferStatus.PREPARED,
        scheduledFor: {
          gte: new Date(),
          lte: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      },
    });

    return {
      campaignKey: key,
      days: campaign.complimentaryDays,
      campaign,
      nearbyScheduled,
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
          sentAt: candidate.sentAt,
          deliveredAt: candidate.deliveredAt,
          firstOpenedAt: candidate.firstOpenedAt,
          claimedAt: candidate.claimedAt,
          openCount: candidate.openCount,
          clickCount: candidate.clickCount,
          unsubscribed: candidate.unsubscribed,
          canSend: candidate.canSend,
          cannotSendReason: candidate.cannotSendReason,
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
    const campaign = await this.getCampaignDefinition(key);
    const expiresInDays = input.expiresInDays ?? 30;
    const { candidates, excluded } = await this.resolveCandidates(
      input.reportIds,
      key,
    );

    return this.queueCandidates({
      candidates,
      excluded,
      campaignKey: key,
      campaign,
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
    const campaign = await this.getCampaignDefinition(key);
    const { candidates, excluded } = await this.resolveAudienceCandidates(
      userIds,
      key,
      campaign.kind,
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
      campaign,
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
    campaign?: CampaignDefinition;
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
      if (!candidate.canSend) {
        excluded.push({
          userId: candidate.userId,
          email: candidate.email,
          reason:
            candidate.cannotSendReason ||
            "This account cannot receive another email for this campaign",
        });
        continue;
      }
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
      const campaignEndsAt = input.campaign?.endsAt;
      if (campaignEndsAt && startsAt.getTime() >= campaignEndsAt.getTime()) {
        excluded.push({
          userId: ready.userId,
          email: ready.email,
          reason: "The send time is after the campaign end time",
        });
        continue;
      }
      const expiresAt = new Date(
        Math.min(
          startsAt.getTime() + input.expiresInDays * DAY_MS,
          input.campaign?.endsAt?.getTime() ?? Number.POSITIVE_INFINITY,
        ),
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
        days: input.campaign?.complimentaryDays ?? RECOVERY_DAYS,
        createdBy: input.adminId,
      };

      if (existing) {
        if (ALREADY_CONTACTED_STATUSES.includes(existing.status)) {
          excluded.push({
            userId: ready.userId,
            email: ready.email,
            reason:
              existing.status === RecoveryOfferStatus.CLAIMED
                ? "Offer was already claimed"
                : existing.status === RecoveryOfferStatus.SENT
                  ? "Offer email was already sent"
                  : "Offer email is already queued or scheduled",
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
        user: { select: { firstName: true, marketingUnsubscribedAt: true } },
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

    if (offer.user.marketingUnsubscribedAt) {
      await this.prisma.recoveryOffer.updateMany({
        where: {
          id: offer.id,
          status: RecoveryOfferStatus.PREPARED,
          tokenHash,
        },
        data: {
          status: RecoveryOfferStatus.CANCELLED,
          failureReason: "Recipient unsubscribed from marketing email",
        },
      });
      return { skipped: true, reason: "unsubscribed" };
    }

    const appUrl = this.frontendBaseUrl();
    const campaign = await this.getCampaignDefinition(offer.campaignKey, {
      requireActive: false,
    });
    const isFestival = campaign.kind === OfferCampaignKind.FESTIVAL;
    const isProductUpdate =
      campaign.kind === OfferCampaignKind.PRODUCT_UPDATE;
    const demoUrl =
      campaign.ctaUrl ||
      `${appUrl}/jewellery-shop-software#ai-photo-studio`;
    const claimUrl = isProductUpdate
      ? demoUrl
      : isFestival
        ? `${appUrl}/offers/${encodeURIComponent(offer.campaignKey)}#token=${encodeURIComponent(job.rawToken)}`
        : `${appUrl}/recovery/pro#token=${encodeURIComponent(job.rawToken)}`;
    const unsubscribeToken = this.createUnsubscribeToken(offer.userId);
    const unsubscribeUrl = this.unsubscribePageUrl(unsubscribeToken);
    const unsubscribeApiUrl = this.unsubscribeApiUrl(unsubscribeToken);
    const subject = campaign.emailSubject;
    const template = isProductUpdate
      ? "product-update"
      : isFestival
        ? "festival-offer"
        : "recovery-offer";
    const category = isProductUpdate
      ? "product_update"
      : isFestival
        ? "festival_offer"
        : "recovery_offer";
    const activeEmailImage =
      campaign.emailImage &&
      campaign.emailImage.expiresAt.getTime() > Date.now()
        ? campaign.emailImage
        : null;
    const emailImageContentId = activeEmailImage
      ? `offer-header-${activeEmailImage.id}`
      : null;
    const activeDesign = isValidOfferEmailDesign(campaign.emailDesign)
      ? (campaign.emailDesign as import("./email-design").OfferEmailDesign)
      : null;
    const designDelivery =
      activeDesign && isProductUpdate
        ? this.renderDesignForDelivery(activeDesign, {
            campaignName: campaign.name,
            unsubscribeUrl,
            firstName: offer.user.firstName || "there",
            brandIconUrl: `${appUrl}/favicon/android-chrome-192x192.png`,
          })
        : null;
    const delivery = designDelivery
      ? await this.mail.sendHtml({
          to: offer.email,
          subject,
          html: designDelivery.html,
          from: `Aakash from Orivraa <${EMAIL_SENDERS.SUPPORT}>`,
          replyTo: EMAIL_SENDERS.SUPPORT,
          idempotencyKey: `recovery-offer/${offer.id}/${tokenHash}`,
          tags: [
            {
              name: "category",
              value: category,
            },
            { name: "offer_id", value: offer.id },
            { name: "campaign", value: offer.campaignKey },
          ],
          headers: {
            "List-Unsubscribe": `<${unsubscribeApiUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        })
      : await this.mail.send({
      to: offer.email,
      subject,
      template,
      from: `Aakash from Orivraa <${EMAIL_SENDERS.SUPPORT}>`,
      replyTo: EMAIL_SENDERS.SUPPORT,
      idempotencyKey: `recovery-offer/${offer.id}/${tokenHash}`,
      tags: [
        {
          name: "category",
          value: category,
        },
        { name: "offer_id", value: offer.id },
        { name: "campaign", value: offer.campaignKey },
      ],
      headers: {
        "List-Unsubscribe": `<${unsubscribeApiUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      ...(activeEmailImage && emailImageContentId
        ? {
            attachments: [
              {
                filename: activeEmailImage.fileName,
                content: activeEmailImage.content,
                contentType: activeEmailImage.contentType,
                contentId: emailImageContentId,
              },
            ],
          }
        : {}),
      context: {
        firstName: offer.user.firstName || "there",
        shopName: offer.shop.shopName,
        days: offer.days,
        claimUrl,
        demoUrl,
        catalogUrl: `${appUrl}/dashboard/shop/products`,
        ctaLabel: campaign.ctaLabel || "See it in action",
        unsubscribeUrl,
        offerExpiresAt: offer.expiresAt,
        campaignName: campaign.name,
        emailSubject: campaign.emailSubject,
        emailHeading: campaign.emailHeading,
        emailBody: campaign.emailBody,
        discountPercent: campaign.discountPercent,
        saleStartsAt: campaign.startsAt,
        saleEndsAt: campaign.endsAt,
        pricingUrl: `${appUrl}/dashboard/shop/billing?tab=upgrade&offer=${encodeURIComponent(offer.campaignKey)}`,
        brandIconUrl: `${appUrl}/favicon/android-chrome-192x192.png`,
        heroImageUrl: emailImageContentId
          ? `cid:${emailImageContentId}`
          : campaign.imageUrl ||
            (isProductUpdate
              ? `${appUrl}/ai-photo-studio-demo.gif`
              : `${appUrl}/luxury-gold-globe.png`),
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
          body: isProductUpdate
            ? `${campaign.name}: ${designDelivery ? campaign.emailSubject : campaign.emailHeading}`
            : isFestival
              ? `${campaign.name}: ${offer.days} days of PRO and ${campaign.discountPercent}% off during the campaign window.`
              : `Service recovery offer: ${offer.days} days of PRO; no card or automatic renewal.`,
          userId: offer.userId,
          adminId: offer.createdBy,
          messageId: delivery.messageId,
          templateKey: category,
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
      return {
        processed: false,
        reason: "Event is not used by recovery metrics",
      };
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
          !current || incoming.getTime() < current.getTime()
            ? incoming
            : current;
        const later = (current: Date | null, incoming: Date) =>
          !current || incoming.getTime() > current.getTime()
            ? incoming
            : current;
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
            linkKind =
              safeDestination.includes("/recovery/pro") ||
              /\/offers\/[a-z0-9][a-z0-9_-]{2,79}/i.test(safeDestination)
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
        campaignKey: true,
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

    const campaign = await this.getCampaignDefinition(offer.campaignKey, {
      requireActive: false,
    });
    return {
      recipient: this.maskEmail(offer.email),
      days: offer.days,
      status: expired ? RecoveryOfferStatus.EXPIRED : offer.status,
      expiresAt: offer.expiresAt,
      claimedAt: offer.claimedAt,
      claimable: !expired && offer.status === RecoveryOfferStatus.SENT,
      requiresEmailVerification: offer.user?.emailVerified === false,
      campaign,
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

        const campaign = await tx.offerCampaign.findUnique({
          where: { key: offer.campaignKey },
          select: { kind: true },
        });
        if (campaign?.kind === OfferCampaignKind.PRODUCT_UPDATE) {
          throw new BadRequestException(
            "This announcement does not include a claimable offer",
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
          campaign?.kind ?? OfferCampaignKind.RECOVERY,
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
    const key = campaignKey?.trim()
      ? this.normalizeCampaignKey(campaignKey, campaignKey)
      : null;
    const [offers, campaignDefinitions] = await Promise.all([
      this.prisma.recoveryOffer.findMany({
        ...(key ? { where: { campaignKey: key } } : {}),
        include: {
          user: {
            select: {
              lastLoginAt: true,
              marketingUnsubscribedAt: true,
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
      }),
      this.prisma.offerCampaign.findMany({
        ...(key ? { where: { key } } : {}),
        select: { key: true, name: true, kind: true },
        orderBy: { startsAt: "desc" },
      }),
    ]);

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

    const rate = (numerator: number, denominator: number) =>
      denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
    const summarize = (values: typeof withReturnStatus) => {
      const count = (
        predicate: (offer: (typeof withReturnStatus)[number]) => boolean,
      ) => values.filter(predicate).length;
      const totals = {
        targeted: values.length,
        scheduled: count(
          (offer) =>
            offer.status === RecoveryOfferStatus.PREPARED &&
            Boolean(offer.scheduledFor),
        ),
        sent: count((offer) => Boolean(offer.sentAt)),
        delivered: count((offer) => Boolean(offer.deliveredAt)),
        opened: count((offer) => Boolean(offer.firstOpenedAt)),
        totalOpens: values.reduce((sum, offer) => sum + offer.openCount, 0),
        clicked: count((offer) => Boolean(offer.firstClickedAt)),
        totalClicks: values.reduce((sum, offer) => sum + offer.clickCount, 0),
        claimed: count((offer) => Boolean(offer.claimedAt)),
        rejoined: count((offer) => Boolean(offer.rejoinedAt)),
        bounced: count((offer) => Boolean(offer.bouncedAt)),
        complained: count((offer) => Boolean(offer.complainedAt)),
        unsubscribed: count((offer) =>
          Boolean(offer.user.marketingUnsubscribedAt),
        ),
        failed: count(
          (offer) =>
            offer.status === RecoveryOfferStatus.SEND_FAILED ||
            Boolean(offer.failedAt) ||
            Boolean(offer.suppressedAt),
        ),
      };
      return {
        totals,
        rates: {
          delivery: rate(totals.delivered, totals.sent),
          open: rate(totals.opened, totals.delivered),
          click: rate(totals.clicked, totals.delivered),
          claim: rate(totals.claimed, totals.delivered),
          rejoin: rate(totals.rejoined, totals.sent),
        },
      };
    };

    const { totals, rates } = summarize(withReturnStatus);

    const countryCodes = [
      ...new Set(withReturnStatus.map((offer) => offer.shop.country)),
    ];
    const byCountry = countryCodes
      .map((country) => {
        const countryOffers = withReturnStatus.filter(
          (offer) => offer.shop.country === country,
        );
        const countryTotals = summarize(countryOffers).totals;
        return {
          country,
          targeted: countryTotals.targeted,
          sent: countryTotals.sent,
          delivered: countryTotals.delivered,
          opened: countryTotals.opened,
          clicked: countryTotals.clicked,
          claimed: countryTotals.claimed,
          rejoined: countryTotals.rejoined,
        };
      })
      .sort((a, b) => b.targeted - a.targeted);

    const definitionByKey = new Map(
      campaignDefinitions.map((campaign) => [campaign.key, campaign]),
    );
    const observedCampaignKeys = withReturnStatus.map(
      (offer) => offer.campaignKey || DEFAULT_AUDIENCE_CAMPAIGN_KEY,
    );
    const campaignKeys = [
      ...new Set([
        ...campaignDefinitions.map((campaign) => campaign.key),
        ...observedCampaignKeys,
        ...(key ? [key] : [DEFAULT_AUDIENCE_CAMPAIGN_KEY]),
      ]),
    ];
    const byCampaign = campaignKeys.map((resolvedCampaignKey) => {
      const definition = definitionByKey.get(resolvedCampaignKey);
      const values = withReturnStatus.filter(
        (offer) =>
          (offer.campaignKey || DEFAULT_AUDIENCE_CAMPAIGN_KEY) ===
          resolvedCampaignKey,
      );
      return {
        campaignKey: resolvedCampaignKey,
        name:
          definition?.name ||
          (resolvedCampaignKey === DEFAULT_AUDIENCE_CAMPAIGN_KEY
            ? "Customer win-back"
            : resolvedCampaignKey === DEFAULT_INCIDENT_CAMPAIGN_KEY
              ? "Incident recovery"
              : resolvedCampaignKey),
        kind: definition?.kind || OfferCampaignKind.RECOVERY,
        ...summarize(values),
      };
    });

    return {
      scope: key ? "CAMPAIGN" : "ALL",
      campaignKey: key,
      totals,
      rates,
      byCountry,
      byCampaign,
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
    campaignKind: OfferCampaignKind = OfferCampaignKind.RECOVERY,
  ) {
    const uniqueUserIds = userIds
      ? [...new Set(userIds.filter((id) => id.trim()))]
      : undefined;
    const resolved = await this.resolveUsers(
      uniqueUserIds,
      campaignKey,
      new Map(),
      true,
      campaignKind,
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
    campaignKind: OfferCampaignKind = OfferCampaignKind.RECOVERY,
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
    const marketingBlockedUserIds =
      campaignKind === OfferCampaignKind.FESTIVAL ||
      campaignKind === OfferCampaignKind.PRODUCT_UPDATE
        ? new Set(
            (
              await this.prisma.recoveryOffer.findMany({
                where: {
                  userId: { in: users.map((user) => user.id) },
                  OR: [
                    { complainedAt: { not: null } },
                    { suppressedAt: { not: null } },
                  ],
                },
                select: { userId: true },
              })
            ).map((offer) => offer.userId),
          )
        : new Set<string>();

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
      if (
        campaignKind !== OfferCampaignKind.PRODUCT_UPDATE &&
        !proCountries.has(country)
      ) {
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
      const unsubscribed = Boolean(user.marketingUnsubscribedAt);
      const marketingSuppressed = marketingBlockedUserIds.has(user.id);
      const contact = this.describeContactability({
        unsubscribed,
        marketingSuppressed,
        offerStatus: existingOffer?.status || null,
      });

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
        sentAt: existingOffer?.sentAt || null,
        deliveredAt: existingOffer?.deliveredAt || null,
        firstOpenedAt: existingOffer?.firstOpenedAt || null,
        claimedAt: existingOffer?.claimedAt || null,
        openCount: existingOffer?.openCount || 0,
        clickCount: existingOffer?.clickCount || 0,
        unsubscribed,
        canSend: contact.canSend,
        cannotSendReason: contact.cannotSendReason,
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
    campaignKind: OfferCampaignKind = OfferCampaignKind.RECOVERY,
  ): Promise<{
    subscription: {
      id: string;
      currentPeriodEnd: Date;
      plan: { name: string };
    };
    outcome: RecoveryGrantOutcome;
  }> {
    const now = new Date();
    let targetEnd = new Date(now.getTime() + offer.days * DAY_MS);
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
      if (campaignKind === OfferCampaignKind.FESTIVAL) {
        const extensionStart =
          existingPro.currentPeriodEnd.getTime() > now.getTime()
            ? existingPro.currentPeriodEnd
            : now;
        targetEnd = new Date(extensionStart.getTime() + offer.days * DAY_MS);
      }
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

  async unsubscribe(token: unknown) {
    const userId = this.verifyUnsubscribeToken(token);
    if (!userId) {
      throw new BadRequestException("This unsubscribe link is invalid");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, marketingUnsubscribedAt: true },
    });
    if (!user) {
      throw new NotFoundException("This unsubscribe link is invalid");
    }
    if (user.marketingUnsubscribedAt) {
      return { unsubscribed: true, alreadyUnsubscribed: true };
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { marketingUnsubscribedAt: now },
      }),
      this.prisma.recoveryOffer.updateMany({
        where: { userId, status: RecoveryOfferStatus.PREPARED },
        data: {
          status: RecoveryOfferStatus.CANCELLED,
          failureReason: "Recipient unsubscribed from marketing email",
        },
      }),
    ]);
    return { unsubscribed: true, alreadyUnsubscribed: false };
  }

  unsubscribePageUrl(token: string) {
    return `${this.frontendBaseUrl()}/offers/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  private unsubscribeApiUrl(token: string) {
    return `${this.apiBaseUrl()}/api/recovery-offers/unsubscribe?token=${encodeURIComponent(token)}`;
  }

  private frontendBaseUrl() {
    return (
      this.config.get<string>("FRONTEND_URL") ||
      this.config.get<string>("APP_URL") ||
      "https://www.orivraa.com"
    ).replace(/\/$/, "");
  }

  private apiBaseUrl() {
    return (
      this.config.get<string>("API_URL") || "https://api.orivraa.com"
    ).replace(/\/$/, "");
  }

  createUnsubscribeToken(userId: string) {
    const signature = createHmac("sha256", this.unsubscribeSecret())
      .update(`offer-unsub:${userId}`)
      .digest("base64url");
    return `${userId}.${signature}`;
  }

  private verifyUnsubscribeToken(token: unknown) {
    if (typeof token !== "string" || !token.includes(".")) return null;
    const separator = token.lastIndexOf(".");
    const userId = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    if (!userId || !signature) return null;
    const expected = createHmac("sha256", this.unsubscribeSecret())
      .update(`offer-unsub:${userId}`)
      .digest("base64url");
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length) return null;
    if (!timingSafeEqual(left, right)) return null;
    return userId;
  }

  private unsubscribeSecret() {
    return (
      this.config.get<string>("JWT_SECRET") || process.env.JWT_SECRET || ""
    );
  }

  private describeContactability(input: {
    unsubscribed: boolean;
    marketingSuppressed: boolean;
    offerStatus: RecoveryOfferStatus | null;
  }): { canSend: boolean; cannotSendReason: string | null } {
    if (input.unsubscribed) {
      return {
        canSend: false,
        cannotSendReason: "Unsubscribed from marketing emails",
      };
    }
    if (input.marketingSuppressed) {
      return {
        canSend: false,
        cannotSendReason: "Marketing email is suppressed for this account",
      };
    }
    if (
      input.offerStatus &&
      ALREADY_CONTACTED_STATUSES.includes(input.offerStatus)
    ) {
      if (input.offerStatus === RecoveryOfferStatus.CLAIMED) {
        return {
          canSend: false,
          cannotSendReason: "Offer was already claimed",
        };
      }
      if (input.offerStatus === RecoveryOfferStatus.CLAIMING) {
        return {
          canSend: false,
          cannotSendReason: "Offer is already being claimed",
        };
      }
      if (input.offerStatus === RecoveryOfferStatus.SENT) {
        return {
          canSend: false,
          cannotSendReason: "Offer email was already sent",
        };
      }
      return {
        canSend: false,
        cannotSendReason: "Offer email is already queued or scheduled",
      };
    }
    return { canSend: true, cannotSendReason: null };
  }

  private normalizeCampaignKey(value: string | undefined, fallback: string) {
    const key = (value || fallback).trim();
    if (!/^[a-z0-9][a-z0-9_-]{2,79}$/i.test(key)) {
      throw new BadRequestException("Invalid recovery campaign key");
    }
    return key;
  }

  private async assertEmailContentEditable(
    campaignKey: string,
    client: PrismaService | Prisma.TransactionClient,
  ) {
    const imminentSend = await client.recoveryOffer.findFirst({
      where: {
        campaignKey,
        status: RecoveryOfferStatus.PREPARED,
        OR: [
          { scheduledFor: { lte: new Date(Date.now() + EMAIL_EDIT_LOCK_MS) } },
          // Immediate sends are queued without a schedule; their content
          // renders at delivery time, so lock them too.
          { scheduledFor: null },
        ],
      },
      select: { id: true },
    });
    if (imminentSend) {
      throw new BadRequestException(
        "Email content is locked because an offer email for this campaign is scheduled within 5 minutes",
      );
    }
  }

  private async validateDraftImage(
    input: UpdateOfferCampaignEmailDto,
    file?: Express.Multer.File,
  ): Promise<ValidatedOfferEmailImage | null> {
    if (input.imageMode === "UPLOAD" && !file) {
      throw new BadRequestException("Choose a PNG, JPEG, or GIF to upload");
    }
    if (input.imageMode !== "UPLOAD" && file) {
      throw new BadRequestException(
        "An uploaded file can only be used with UPLOAD image mode",
      );
    }
    if (input.imageMode === "URL") {
      const imageUrl = input.imageUrl?.trim() || "";
      if (!/^https?:\/\/\S+$/i.test(imageUrl)) {
        throw new BadRequestException("Enter a valid http(s) image URL");
      }
    }
    if (!file) return null;
    if (file.size < 1 || file.buffer.length < 1) {
      throw new BadRequestException("The uploaded image is empty");
    }
    if (
      file.size > OFFER_EMAIL_IMAGE_MAX_BYTES ||
      file.buffer.length > OFFER_EMAIL_IMAGE_MAX_BYTES
    ) {
      throw new BadRequestException(
        "Email header images must be 5 MB or smaller",
      );
    }

    const contentType = this.detectOfferEmailImageType(file.buffer);
    if (!contentType) {
      throw new BadRequestException(
        "Only PNG, JPEG, and GIF images are allowed",
      );
    }

    try {
      const metadata = await sharp(file.buffer, {
        animated: contentType === "image/gif",
        limitInputPixels: OFFER_EMAIL_IMAGE_MAX_PIXELS,
      }).metadata();
      const expectedFormat =
        contentType === "image/jpeg"
          ? "jpeg"
          : contentType === "image/png"
            ? "png"
            : "gif";
      if (
        metadata.format !== expectedFormat ||
        !metadata.width ||
        !metadata.height
      ) {
        throw new Error("Image metadata does not match its signature");
      }
      if (metadata.width * metadata.height > OFFER_EMAIL_IMAGE_MAX_PIXELS) {
        throw new Error("Image dimensions are too large");
      }
    } catch {
      throw new BadRequestException(
        "The uploaded image is invalid or exceeds 40 megapixels",
      );
    }

    const extension =
      contentType === "image/jpeg"
        ? "jpg"
        : contentType === "image/png"
          ? "png"
          : "gif";
    const rawName = (file.originalname || "offer-header")
      .split(/[\\/]/)
      .pop()!
      .replace(/\.[^.]+$/, "");
    const safeStem =
      rawName
        .normalize("NFKD")
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "offer-header";

    return {
      fileName: `${safeStem}.${extension}`,
      contentType,
      content: file.buffer,
    };
  }

  private detectOfferEmailImageType(
    content: Buffer,
  ): ValidatedOfferEmailImage["contentType"] | null {
    if (
      content.length >= 8 &&
      content
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return "image/png";
    }
    if (
      content.length >= 3 &&
      content[0] === 0xff &&
      content[1] === 0xd8 &&
      content[2] === 0xff
    ) {
      return "image/jpeg";
    }
    if (content.length >= 6) {
      const signature = content.subarray(0, 6).toString("ascii");
      if (signature === "GIF87a" || signature === "GIF89a") {
        return "image/gif";
      }
    }
    return null;
  }

  private resolveDraftHeroImage(
    campaign: CampaignDefinition,
    input: UpdateOfferCampaignEmailDto,
    uploadedImage: ValidatedOfferEmailImage | null,
  ) {
    if (input.imageMode === "UPLOAD" && uploadedImage) {
      return `data:${uploadedImage.contentType};base64,${uploadedImage.content.toString("base64")}`;
    }
    if (input.imageMode === "URL") {
      return input.imageUrl!.trim();
    }
    if (input.imageMode === "DEFAULT") {
      return campaign.kind === OfferCampaignKind.PRODUCT_UPDATE
        ? `${this.frontendBaseUrl()}/ai-photo-studio-demo.gif`
        : `${this.frontendBaseUrl()}/luxury-gold-globe.png`;
    }
    if (
      campaign.emailImage &&
      campaign.emailImage.expiresAt.getTime() > Date.now()
    ) {
      return `data:${campaign.emailImage.contentType};base64,${campaign.emailImage.content.toString("base64")}`;
    }
    return (
      campaign.imageUrl ||
      (campaign.kind === OfferCampaignKind.PRODUCT_UPDATE
        ? `${this.frontendBaseUrl()}/ai-photo-studio-demo.gif`
        : `${this.frontendBaseUrl()}/luxury-gold-globe.png`)
    );
  }

  private async getCampaignDefinition(
    key?: string,
    options: { requireActive?: boolean } = {},
  ): Promise<CampaignDefinition> {
    const resolvedKey = key || DEFAULT_AUDIENCE_CAMPAIGN_KEY;
    const campaign = await this.prisma.offerCampaign.findUnique({
      where: { key: resolvedKey },
      include: { emailImage: true },
    });
    if (campaign) {
      if (options.requireActive !== false && !campaign.isActive) {
        throw new BadRequestException("This offer campaign is inactive");
      }
      return campaign;
    }
    if (
      resolvedKey === DEFAULT_AUDIENCE_CAMPAIGN_KEY ||
      resolvedKey === DEFAULT_INCIDENT_CAMPAIGN_KEY
    ) {
      return {
        key: resolvedKey,
        name: "Customer win-back",
        kind: OfferCampaignKind.RECOVERY,
        complimentaryDays: RECOVERY_DAYS,
        discountPercent: 0,
        startsAt: null,
        endsAt: null,
        imageUrl: null,
        emailSubject: `We’re sorry about the invoice issue — ${RECOVERY_DAYS} days of Orivraa Pro on us`,
        emailHeading: "We’re sorry about the invoice issue.",
        emailBody:
          "We fixed the issue, strengthened monitoring, and improved invoice reliability.",
        ctaUrl: null,
        ctaLabel: null,
        emailImage: null,
      };
    }
    throw new NotFoundException("Offer campaign not found");
  }

  private validateCampaignWindow(
    input: Pick<
      CreateOfferCampaignDto,
      | "startsAt"
      | "endsAt"
      | "kind"
      | "complimentaryDays"
      | "discountPercent"
      | "ctaUrl"
    >,
  ) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (startsAt.getTime() >= endsAt.getTime()) {
      throw new BadRequestException(
        "Offer end time must be after its start time",
      );
    }
    if (input.kind === "FESTIVAL" && input.discountPercent <= 0) {
      throw new BadRequestException(
        "Festival campaigns require a positive discount",
      );
    }
    if (input.kind === "PRODUCT_UPDATE") {
      if (input.complimentaryDays !== 0 || input.discountPercent !== 0) {
        throw new BadRequestException(
          "Product-update campaigns cannot include complimentary days or a plan discount",
        );
      }
      const ctaUrl = input.ctaUrl?.trim() || "";
      if (ctaUrl && !/^https:\/\/\S+$/i.test(ctaUrl)) {
        throw new BadRequestException(
          "Product-update campaigns need an https demo URL",
        );
      }
    } else if (input.complimentaryDays < 1) {
      throw new BadRequestException(
        "Recovery and festival campaigns need at least one complimentary day",
      );
    }
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
