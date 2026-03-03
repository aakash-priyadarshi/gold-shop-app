import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface SubmitCrashReportDto {
  errorMessage: string;
  errorStack?: string;
  page: string;
  userAction?: string;
  platform: "web" | "desktop";
  userRole?: string;
  userId?: string;
  userAgent?: string;
  appVersion?: string;
}

export interface GetCrashReportsQuery {
  page?: number;
  limit?: number;
  status?: string;
  platform?: string;
}

@Injectable()
export class CrashReportsService {
  private readonly logger = new Logger(CrashReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Submit a new crash report (public — no auth required) */
  async submit(dto: SubmitCrashReportDto, ip?: string) {
    const report = await this.prisma.crashReport.create({
      data: {
        errorMessage: dto.errorMessage.slice(0, 10000), // cap at 10k chars
        errorStack: dto.errorStack?.slice(0, 20000),
        page: dto.page.slice(0, 2000),
        userAction: dto.userAction?.slice(0, 2000),
        platform: dto.platform,
        userRole: dto.userRole || "guest",
        userId: dto.userId || null,
        userAgent: dto.userAgent?.slice(0, 1000),
        appVersion: dto.appVersion || null,
        ip: ip || null,
      },
    });
    this.logger.log(
      `Crash report submitted: ${report.id} [${dto.platform}] ${dto.page}`,
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
    const [total, newCount, reviewedCount, resolvedCount, byPlatform] =
      await Promise.all([
        this.prisma.crashReport.count(),
        this.prisma.crashReport.count({ where: { status: "new" } }),
        this.prisma.crashReport.count({ where: { status: "reviewed" } }),
        this.prisma.crashReport.count({ where: { status: "resolved" } }),
        this.prisma.crashReport.groupBy({
          by: ["platform"],
          _count: true,
        }),
      ]);

    return {
      total,
      new: newCount,
      reviewed: reviewedCount,
      resolved: resolvedCount,
      byPlatform: Object.fromEntries(
        byPlatform.map((p) => [p.platform, p._count]),
      ),
    };
  }
}
