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
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
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
  ) {
    return this.crashReportsService.getAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      status,
      platform,
    });
  }

  /** Summary statistics */
  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.crashReportsService.getStats();
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
