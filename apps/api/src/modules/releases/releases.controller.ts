import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    Logger,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Request } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
    CreateReleaseDto,
    DesktopHeartbeatDto,
    PublishReleaseDto,
    UpdateReleaseDto,
} from "./dto/release.dto";
import { ReleasesService } from "./releases.service";

@ApiTags("releases")
@Controller("releases")
export class ReleasesController {
  private readonly logger = new Logger(ReleasesController.name);

  constructor(private readonly releasesService: ReleasesService) {}

  // ═══════════════════════════════════════
  // PUBLIC ENDPOINTS — download page, changelogs
  // ═══════════════════════════════════════

  /**
   * GET /api/releases/latest
   * Returns latest release per platform (for download page)
   */
  @Get("latest")
  @ApiOperation({ summary: "Get latest releases per platform" })
  async getLatest() {
    return this.releasesService.getLatestReleases();
  }

  /**
   * GET /api/releases/platform/:platform
   * Returns all active releases for a platform (latest + older)
   */
  @Get("platform/:platform")
  @ApiOperation({ summary: "Get releases for a specific platform" })
  async getForPlatform(
    @Param("platform") platform: string,
    @Query("limit") limit?: string,
  ) {
    return this.releasesService.getReleasesForPlatform(
      platform,
      limit ? parseInt(limit, 10) : 6,
    );
  }

  /**
   * GET /api/releases/changelog
   * Combined changelog for all platforms
   */
  @Get("changelog")
  @ApiOperation({ summary: "Get combined changelog" })
  async getChangelog(@Query("limit") limit?: string) {
    return this.releasesService.getChangelog(limit ? parseInt(limit, 10) : 20);
  }

  /**
   * GET /api/releases/check-desktop
   * Check if the requesting IP has a desktop app running
   */
  @Get("check-desktop")
  @ApiOperation({ summary: "Check if desktop app detected from this IP" })
  async checkDesktopByIp(@Req() req: Request) {
    const ip = this.extractIp(req);
    return this.releasesService.checkDesktopByIp(ip);
  }

  // ═══════════════════════════════════════
  // AUTHENTICATED — heartbeat, user status
  // ═══════════════════════════════════════

  /**
   * POST /api/releases/heartbeat
   * Desktop app sends periodic heartbeat with version info
   */
  @Post("heartbeat")
  @ApiOperation({ summary: "Desktop app heartbeat" })
  async heartbeat(
    @Body() dto: DesktopHeartbeatDto,
    @Req() req: Request,
    @Headers("authorization") auth?: string,
  ) {
    const ip = this.extractIp(req);
    // Try to extract user from token if present (optional auth)
    let userId: string | null = null;
    if (auth) {
      try {
        const user = (req as any).user;
        userId = user?.id || null;
      } catch {
        // Not authenticated — that's fine
      }
    }
    return this.releasesService.heartbeat(dto, userId, ip);
  }

  /**
   * GET /api/releases/my-desktop
   * Seller checks their desktop app status
   */
  @Get("my-desktop")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get my desktop app status" })
  async getMyDesktopStatus(@CurrentUser() user: any) {
    return this.releasesService.getUserDesktopStatus(user.id);
  }

  // ═══════════════════════════════════════
  // ADMIN — manage releases
  // ═══════════════════════════════════════

  /**
   * GET /api/releases/admin/list
   * List all releases (admin panel)
   */
  @Get("admin/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all releases (admin)" })
  async adminListAll(@Query("platform") platform?: string) {
    return this.releasesService.listAll(platform);
  }

  /**
   * POST /api/releases/admin
   * Create a new release (admin)
   */
  @Post("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create release (admin)" })
  async adminCreate(@Body() dto: CreateReleaseDto) {
    return this.releasesService.create(dto);
  }

  /**
   * PATCH /api/releases/admin/:id
   * Update a release (admin) — edit changelog, toggle visibility
   */
  @Patch("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update release (admin)" })
  async adminUpdate(@Param("id") id: string, @Body() dto: UpdateReleaseDto) {
    return this.releasesService.update(id, dto);
  }

  /**
   * POST /api/releases/publish
   * Publish a new release — auto-sets as latest, deactivates old ones.
   * Called by CI or manually by admin.
   */
  @Post("publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Publish a new release (sets as latest)" })
  async publish(@Body() dto: PublishReleaseDto) {
    return this.releasesService.publish(dto);
  }

  /**
   * DELETE /api/releases/admin/:id
   * Delete a release permanently (admin)
   */
  @Delete("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete release (admin)" })
  async adminDelete(@Param("id") id: string) {
    return this.releasesService.delete(id);
  }

  /**
   * GET /api/releases/admin/analytics
   * Desktop session analytics (admin)
   */
  @Get("admin/analytics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Desktop session analytics (admin)" })
  async getAnalytics() {
    return this.releasesService.getDesktopAnalytics();
  }

  /**
   * GET /api/releases/admin/download-stats
   * Download click counts per release/platform (admin)
   */
  @Get("admin/download-stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Download click stats (admin)" })
  async getDownloadStats() {
    return this.releasesService.getDownloadStats();
  }

  /**
   * POST /api/releases/track-download/:id
   * Public — called by download page on button click. Increments download count.
   */
  @Post("track-download/:id")
  @ApiOperation({ summary: "Track a download click (public)" })
  async trackDownload(@Param("id") id: string) {
    return this.releasesService.trackDownload(id);
  }

  // ─── Helpers ───────────────────────────

  private extractIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
    if (Array.isArray(forwarded)) return forwarded[0];
    return req.ip || req.socket.remoteAddress || "unknown";
  }
}
