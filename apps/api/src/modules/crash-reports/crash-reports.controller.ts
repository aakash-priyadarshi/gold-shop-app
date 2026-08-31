import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Response } from "express";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Throttle } from "@nestjs/throttler";
import { SkipSecurity } from "../security/security.guard";
import {
  CrashReportsService,
  SubmitCrashReportDto,
} from "./crash-reports.service";

@Controller("crash-reports")
export class CrashReportsController {
  constructor(private readonly crashReportsService: CrashReportsService) {}

  /**
   * Submit a crash report — public endpoint, no auth required.
   * Users may be logged out or blocked when a crash happens.
   */
  @Post()
  @SkipSecurity()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @HttpCode(HttpStatus.CREATED)
  async submit(@Body() body: SubmitCrashReportDto, @Req() req: any) {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";
    return this.crashReportsService.submit(body, ip);
  }

  // ─── Admin-only endpoints below ──────────────────────────

  /** List all crash reports (paginated) */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("platform") platform?: string,
    @Query("userTriggered") userTriggered?: string,
    @Query("since") since?: string,
  ) {
    return this.crashReportsService.getAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      status,
      platform,
      userTriggered:
        userTriggered === "true"
          ? true
          : userTriggered === "false"
            ? false
            : undefined,
      since,
    });
  }

  /** Summary statistics */
  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.crashReportsService.getStats();
  }

  /** Slack alert configuration status (never returns the webhook secret). */
  @Get("integrations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getIntegrationsStatus() {
    return this.crashReportsService.getIntegrationsStatus();
  }

  /** Send a test message to the configured Slack channel. */
  @Post("integrations/slack/test")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async testSlack() {
    return this.crashReportsService.sendSlackTest();
  }

  /** Download filtered incidents as AI-ready Markdown or structured JSON. */
  @Get("export")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async exportReports(
    @Res({ passthrough: true }) response: Response,
    @Query("format") format = "markdown",
    @Query("status") status?: string,
    @Query("platform") platform?: string,
    @Query("userTriggered") userTriggered?: string,
    @Query("since") since?: string,
  ) {
    const query = {
      status,
      platform,
      userTriggered:
        userTriggered === "true"
          ? true
          : userTriggered === "false"
            ? false
            : undefined,
      since,
      limit: 2000,
    };
    const date = new Date().toISOString().slice(0, 10);

    if (format.toLowerCase() === "json") {
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="orivraa-crash-reports-${date}.json"`,
      );
      return this.crashReportsService.getAiExport(query);
    }

    response.type("text/markdown; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="orivraa-crash-reports-${date}.md"`,
    );
    return this.crashReportsService.getMarkdownExport(query);
  }

  /** Update several reports from the admin triage queue. */
  @Patch("bulk/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateMany(
    @Body()
    body: {
      ids: string[];
      status?: string;
      adminNotes?: string;
    },
  ) {
    return this.crashReportsService.updateMany(body.ids, body);
  }

  /** Get a single report */
  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getById(@Param("id") id: string) {
    return this.crashReportsService.getById(id);
  }

  /** Update status or admin notes */
  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param("id") id: string,
    @Body() body: { status?: string; adminNotes?: string },
  ) {
    return this.crashReportsService.update(id, body);
  }

  /** Delete a crash report */
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param("id") id: string) {
    return this.crashReportsService.remove(id);
  }
}
