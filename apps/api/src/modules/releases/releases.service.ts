import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateReleaseDto,
  DesktopHeartbeatDto,
  PublishReleaseDto,
  UpdateReleaseDto,
} from "./dto/release.dto";

@Injectable()
export class ReleasesService {
  private readonly logger = new Logger(ReleasesService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Public Endpoints ──────────────────────────────────

  /**
   * Get latest release per platform (for download page)
   */
  async getLatestReleases() {
    const releases = await this.prisma.appRelease.findMany({
      where: { isLatest: true, isActive: true },
      orderBy: { platform: "asc" },
    });
    return releases.map(this.serializeRelease);
  }

  /**
   * Get latest release for a specific platform
   */
  async getLatestForPlatform(platform: string) {
    const release = await this.prisma.appRelease.findFirst({
      where: {
        platform: platform.toUpperCase(),
        isLatest: true,
        isActive: true,
      },
    });
    if (!release)
      throw new NotFoundException(`No release found for ${platform}`);
    return this.serializeRelease(release);
  }

  /**
   * Get all active releases for a platform (latest + older versions)
   */
  async getReleasesForPlatform(platform: string, limit = 6) {
    const releases = await this.prisma.appRelease.findMany({
      where: { platform: platform.toUpperCase(), isActive: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
    return releases.map(this.serializeRelease);
  }

  /**
   * Get combined changelog (all platforms, all versions)
   */
  async getChangelog(limit = 20) {
    const releases = await this.prisma.appRelease.findMany({
      where: { isActive: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true,
        version: true,
        platform: true,
        changelog: true,
        githubChangelog: true,
        changelogSource: true,
        publishedAt: true,
      },
    });
    return releases.map((r) => ({
      ...r,
      displayChangelog: this.resolveChangelog(r),
    }));
  }

  // ─── Desktop Heartbeat ─────────────────────────────────

  /**
   * Register or update a desktop session heartbeat
   */
  async heartbeat(dto: DesktopHeartbeatDto, userId: string | null, ip: string) {
    // Analytics is handled by the dedicated sessions module now.
    // This endpoint just returns version check details for the desktop app.
    const latestWindows = await this.prisma.appRelease.findFirst({
      where: { platform: "WINDOWS", isLatest: true },
      select: { version: true },
    });
    const latestMacos = await this.prisma.appRelease.findFirst({
      where: { platform: "MACOS", isLatest: true },
      select: { version: true },
    });
    const isLatest =
      dto.appVersion === latestWindows?.version ||
      dto.appVersion === latestMacos?.version;

    return {
      isLatest,
      latestVersion: latestWindows?.version || latestMacos?.version,
    };
  }

  /**
   * Get desktop status for a specific user (seller dashboard widget)
   */
  async getUserDesktopStatus(userId: string) {
    const sessions = await this.prisma.desktopSession.findMany({
      where: { userId },
      orderBy: { lastHeartbeat: "desc" },
      take: 5,
    });

    const latestRelease = await this.prisma.appRelease.findFirst({
      where: { platform: "WINDOWS", isLatest: true, isActive: true },
    });

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        appVersion: s.appVersion,
        os: s.os,
        arch: s.arch,
        isLatest: s.appVersion === latestRelease?.version,
        lastSeen: s.lastHeartbeat,
        firstSeen: s.startedAt,
      })),
      latestVersion: latestRelease?.version ?? null,
      hasDesktop: sessions.length > 0,
      isUpToDate: sessions.some((s) => s.appVersion === latestRelease?.version),
    };
  }

  /**
   * Check if any desktop session exists for a given IP
   */
  async checkDesktopByIp(ip: string) {
    const session = await this.prisma.desktopSession.findFirst({
      where: { ipAddress: ip },
      orderBy: { lastHeartbeat: "desc" },
    });
    const latestRelease = await this.prisma.appRelease.findFirst({
      where: { platform: "WINDOWS", isLatest: true, isActive: true },
    });
    return {
      hasDesktop: !!session,
      version: session?.appVersion || null,
      isLatest: session?.appVersion === latestRelease?.version,
      lastSeen: session?.lastHeartbeat || null,
    };
  }

  // ─── Admin Endpoints ──────────────────────────────────

  /**
   * List all releases (admin)
   */
  async listAll(platform?: string) {
    const where = platform ? { platform: platform.toUpperCase() } : {};
    const releases = await this.prisma.appRelease.findMany({
      where,
      orderBy: [{ platform: "asc" }, { publishedAt: "desc" }],
    });
    return releases.map(this.serializeRelease);
  }

  /**
   * Create a new release (admin)
   */
  async create(dto: CreateReleaseDto) {
    // If marked as latest, unset previous latest for this platform
    if (dto.isLatest) {
      await this.prisma.appRelease.updateMany({
        where: { platform: dto.platform, isLatest: true },
        data: { isLatest: false },
      });
    }

    const release = await this.prisma.appRelease.create({
      data: {
        version: dto.version,
        platform: dto.platform,
        channel: dto.channel || "stable",
        downloadUrl: dto.downloadUrl,
        fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
        fileName: dto.fileName,
        changelog: dto.changelog,
        githubChangelog: dto.githubChangelog,
        changelogSource: dto.changelogSource || "github",
        isLatest: dto.isLatest ?? false,
        isActive: true,
        minOs: dto.minOs,
        minRam: dto.minRam,
        minDisk: dto.minDisk,
        architecture: dto.architecture,
      },
    });

    this.logger.log(`Release created: ${dto.platform} v${dto.version}`);
    return this.serializeRelease(release);
  }

  /**
   * Update a release (admin) — edit changelog, toggle active/latest
   */
  async update(id: string, dto: UpdateReleaseDto) {
    const existing = await this.prisma.appRelease.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Release not found");

    // If setting as latest, unset previous
    if (dto.isLatest === true) {
      await this.prisma.appRelease.updateMany({
        where: { platform: existing.platform, isLatest: true, id: { not: id } },
        data: { isLatest: false },
      });
    }

    const updated = await this.prisma.appRelease.update({
      where: { id },
      data: {
        ...(dto.changelog !== undefined && { changelog: dto.changelog }),
        ...(dto.changelogSource !== undefined && {
          changelogSource: dto.changelogSource,
        }),
        ...(dto.isLatest !== undefined && { isLatest: dto.isLatest }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.downloadUrl !== undefined && { downloadUrl: dto.downloadUrl }),
        ...(dto.fileSize !== undefined && {
          fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
        }),
        ...(dto.minOs !== undefined && { minOs: dto.minOs }),
        ...(dto.minRam !== undefined && { minRam: dto.minRam }),
        ...(dto.minDisk !== undefined && { minDisk: dto.minDisk }),
      },
    });
    return this.serializeRelease(updated);
  }

  /**
   * Publish a new release (CI/webhook or admin). Auto-sets as latest,
   * keeps the last 5 older versions active, deactivates older ones.
   */
  async publish(dto: PublishReleaseDto) {
    // Unset current latest
    await this.prisma.appRelease.updateMany({
      where: { platform: dto.platform, isLatest: true },
      data: { isLatest: false },
    });

    // Create the new release as latest
    const release = await this.prisma.appRelease.create({
      data: {
        version: dto.version,
        platform: dto.platform,
        channel: "stable",
        downloadUrl:
          dto.downloadUrl ||
          (dto.platform === "WEB" ? "https://www.orivraa.com" : null),
        fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
        fileName: dto.fileName,
        changelog: dto.changelog || null,
        changelogSource: "github",
        isLatest: true,
        isActive: true,
        minOs:
          dto.minOs ||
          (dto.platform === "WINDOWS" ? "Windows 10 (1809+)" : "macOS 12+"),
        architecture:
          dto.architecture ||
          (dto.platform === "WINDOWS" ? "x64" : "universal"),
        minRam: "4 GB",
        minDisk: "200 MB",
      },
    });

    // Keep latest 6 active (current + 5 older), deactivate the rest
    const allForPlatform = await this.prisma.appRelease.findMany({
      where: { platform: dto.platform, isActive: true },
      orderBy: { publishedAt: "desc" },
    });

    if (allForPlatform.length > 6) {
      const toDeactivate = allForPlatform.slice(6).map((r) => r.id);
      await this.prisma.appRelease.updateMany({
        where: { id: { in: toDeactivate } },
        data: { isActive: false },
      });
      this.logger.log(
        `Deactivated ${toDeactivate.length} old releases for ${dto.platform}`,
      );
    }

    this.logger.log(`Published: ${dto.platform} v${dto.version} (latest)`);
    return this.serializeRelease(release);
  }

  /**
   * Delete a release (admin)
   */
  async delete(id: string) {
    const existing = await this.prisma.appRelease.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Release not found");
    await this.prisma.appRelease.delete({ where: { id } });
    this.logger.log(
      `Deleted release: ${existing.platform} v${existing.version} (${id})`,
    );
    return { deleted: true, id };
  }

  /**
   * Get desktop session analytics (admin)
   */
  async getDesktopAnalytics() {
    const totalSessions = await this.prisma.desktopSession.count();
    const activeLast24h = await this.prisma.desktopSession.count({
      where: { lastHeartbeat: { gte: new Date(Date.now() - 86400000) } },
    });
    const activeLast7d = await this.prisma.desktopSession.count({
      where: { lastHeartbeat: { gte: new Date(Date.now() - 604800000) } },
    });

    // Version distribution
    const versionGroups = await this.prisma.desktopSession.groupBy({
      by: ["appVersion"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // OS distribution
    const osGroups = await this.prisma.desktopSession.groupBy({
      by: ["os"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const latestRelease = await this.prisma.appRelease.findFirst({
      where: { platform: "WINDOWS", isLatest: true, isActive: true },
    });
    const upToDate = latestRelease ? await this.prisma.desktopSession.count({
      where: { appVersion: latestRelease.version },
    }) : 0;

    return {
      total: totalSessions,
      activeLast24h,
      activeLast7d,
      upToDate,
      outdated: totalSessions - upToDate,
      versionDistribution: versionGroups.map((g) => ({
        version: g.appVersion,
        count: g._count.id,
      })),
      osDistribution: osGroups.map((g) => ({
        os: g.os,
        count: g._count.id,
      })),
    };
  }

  // ─── Helpers ───────────────────────────────────────────

  private resolveChangelog(r: {
    changelog?: string | null;
    githubChangelog?: string | null;
    changelogSource: string;
  }) {
    if (r.changelogSource === "manual" && r.changelog) return r.changelog;
    if (r.changelogSource === "merged") {
      return [r.changelog, r.githubChangelog]
        .filter(Boolean)
        .join("\n\n---\n\n");
    }
    return r.githubChangelog || r.changelog || "No changelog available.";
  }

  private serializeRelease(r: any) {
    return {
      ...r,
      fileSize: r.fileSize ? Number(r.fileSize) : null,
    };
  }
}
