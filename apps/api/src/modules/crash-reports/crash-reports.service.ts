import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface SubmitCrashReportDto {
  errorMessage: string;
  errorStack?: string;
  page: string;
  userAction?: string;
  platform: "web" | "desktop";
  userRole?: string;
  userId?: string;
  sessionToken?: string;
  userAgent?: string;
  appVersion?: string;
  // Phase 1 additions — user-triggered reports
  userTriggered?: boolean;
  userDescription?: string;
  screenshotUrl?: string;
  frustrationType?: string; // 'rage_click' | 'api_error' | 'manual' | 'boundary' | 'toast'
}

export interface GetCrashReportsQuery {
  page?: number;
  limit?: number;
  status?: string;
  platform?: string;
  userTriggered?: boolean;
  since?: string;
}

const SUBMIT_RATE_LIMIT = 30;
const SUBMIT_RATE_WINDOW_MS = 60_000;
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

@Injectable()
export class CrashReportsService {
  private readonly logger = new Logger(CrashReportsService.name);
  private readonly ipHits = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {}

  private enforceIpRateLimit(ip?: string) {
    if (!ip || ip === "unknown") return;
    const now = Date.now();
    const hits = (this.ipHits.get(ip) || []).filter(
      (t) => now - t < SUBMIT_RATE_WINDOW_MS,
    );
    if (hits.length >= SUBMIT_RATE_LIMIT) {
      throw new HttpException(
        "Too many error reports from this address",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    hits.push(now);
    this.ipHits.set(ip, hits);
  }

  /** Submit a new crash report (public — no auth required) */
  async submit(dto: SubmitCrashReportDto, ip?: string) {
    if (!dto?.errorMessage || typeof dto.errorMessage !== "string") {
      throw new BadRequestException("errorMessage is required");
    }
    if (!dto.page || typeof dto.page !== "string") {
      throw new BadRequestException("page is required");
    }

    this.enforceIpRateLimit(ip);

    const errorMessage = dto.errorMessage.slice(0, 10000);
    const page = dto.page.slice(0, 2000);
    const platform =
      dto.platform === "desktop" || dto.platform === "web"
        ? dto.platform
        : "web";

    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const existing = await this.prisma.crashReport.findFirst({
      where: { page, errorMessage, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });

    if (existing && dto.userTriggered) {
      const updated = await this.prisma.crashReport.update({
        where: { id: existing.id },
        data: {
          userTriggered: true,
          ...(dto.userDescription && {
            userDescription: dto.userDescription.slice(0, 5000),
          }),
          ...(dto.screenshotUrl && {
            screenshotUrl: dto.screenshotUrl.slice(0, 2000),
          }),
        },
      });
      return {
        id: updated.id,
        message: "Report updated",
        duplicate: true,
      };
    }

    if (existing) {
      return {
        id: existing.id,
        message: "Duplicate suppressed",
        duplicate: true,
      };
    }

    const report = await this.prisma.crashReport.create({
      data: {
        errorMessage,
        errorStack: dto.errorStack?.slice(0, 20000),
        page,
        userAction: dto.userAction?.slice(0, 2000),
        platform,
        userRole: dto.userRole || "guest",
        userId: dto.userId || null,
        userAgent: dto.userAgent?.slice(0, 1000),
        appVersion: dto.appVersion || null,
        ip: ip || null,
        sessionToken: dto.sessionToken || null,
        ...(dto.userTriggered !== undefined && {
          userTriggered: dto.userTriggered,
        }),
        ...(dto.userDescription && {
          userDescription: dto.userDescription.slice(0, 5000),
        }),
        ...(dto.screenshotUrl && {
          screenshotUrl: dto.screenshotUrl.slice(0, 2000),
        }),
        ...(dto.frustrationType && { frustrationType: dto.frustrationType }),
      },
    });
    this.logger.log(
      `Crash report submitted: ${report.id} [${platform}] ${page}${dto.userTriggered ? " [USER-TRIGGERED]" : ""}`,
    );
    return { id: report.id, message: "Report submitted successfully" };
  }

  /** Get paginated crash reports (admin only) */
  async getAll(query: GetCrashReportsQuery) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.platform) where.platform = query.platform;
    if (query.userTriggered !== undefined) where.userTriggered = query.userTriggered;
    if (query.since) {
      const sinceDate = new Date(query.since);
      if (!Number.isNaN(sinceDate.getTime())) {
        where.createdAt = { gte: sinceDate };
      }
    }

    const [reports, total] = await Promise.all([
      this.prisma.crashReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.crashReport.count({ where }),
    ]);

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Get a single crash report by ID */
  async getById(id: string) {
    return this.prisma.crashReport.findUnique({ where: { id } });
  }

  /** Update crash report status / admin notes */
  async update(id: string, data: { status?: string; adminNotes?: string }) {
    return this.prisma.crashReport.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes }),
      },
    });
  }

  /** Delete a crash report */
  async remove(id: string) {
    await this.prisma.crashReport.delete({ where: { id } });
    return { success: true };
  }

  /** Get summary stats for dashboard */
  async getStats() {
    const startOfUtcDay = new Date();
    startOfUtcDay.setUTCHours(0, 0, 0, 0);

    const [total, newCount, reviewedCount, resolvedCount, byPlatform, userTriggeredCount, withScreenshot, byFrustration, todayCount] =
      await Promise.all([
        this.prisma.crashReport.count(),
        this.prisma.crashReport.count({ where: { status: "new" } }),
        this.prisma.crashReport.count({ where: { status: "reviewed" } }),
        this.prisma.crashReport.count({ where: { status: "resolved" } }),
        this.prisma.crashReport.groupBy({ by: ["platform"], _count: true }),
        this.prisma.crashReport.count({ where: { userTriggered: true } }),
        this.prisma.crashReport.count({ where: { screenshotUrl: { not: null } } }),
        this.prisma.crashReport.groupBy({ by: ["frustrationType" as any], _count: true }).catch(() => []),
        this.prisma.crashReport.count({ where: { createdAt: { gte: startOfUtcDay } } }),
      ]);

    return {
      total,
      new: newCount,
      reviewed: reviewedCount,
      resolved: resolvedCount,
      today: todayCount,
      userTriggered: userTriggeredCount,
      withScreenshot,
      byPlatform: Object.fromEntries(
        byPlatform.map((p) => [p.platform, p._count]),
      ),
      byFrustration: Object.fromEntries(
        (byFrustration as any[]).filter(f => f.frustrationType).map((f) => [f.frustrationType, f._count]),
      ),
    };
  }
}
