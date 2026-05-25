import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SeoAuditService, SeoAuditSettings } from "./seo-audit.service";

@ApiTags("admin")
@Controller("admin/seo-audit")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SeoAuditController {
  private readonly logger = new Logger(SeoAuditController.name);

  constructor(private readonly seoAuditService: SeoAuditService) {}

  @Get("status")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get the latest SEO audit status, historical reports, and settings" })
  async getStatus() {
    const latestReport = this.seoAuditService.getLatestReport();
    const history = this.seoAuditService.getAuditHistory();
    const settings = this.seoAuditService.getSettings();

    return {
      success: true,
      latestReport,
      history,
      settings,
    };
  }

  @Post("run")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Trigger a manual SEO bot audit crawl" })
  @HttpCode(HttpStatus.OK)
  async triggerAudit() {
    this.logger.log("Manual SEO audit triggered by administrator.");
    // Run the audit in the background so the request doesn't timeout if it takes longer
    // Wait, the client will poll or we can just run it synchronously if it finishes in 2-3 seconds,
    // but running it in the background is safer. Let's start it in the background, or do it synchronously
    // and wait up to 10 seconds. Since it's limited to public routes (~20-30 routes), in dev/prod it takes 3-5 seconds.
    // Let's run it synchronously so we can return the exact results immediately! It's much cleaner for the UI.
    try {
      const report = await this.seoAuditService.runAudit();
      return {
        success: true,
        message: "SEO audit completed successfully.",
        report,
      };
    } catch (error: any) {
      this.logger.error("SEO audit failed:", error);
      return {
        success: false,
        message: error.message || "An SEO audit crawl is already in progress.",
      };
    }
  }

  @Post("settings")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Save auto-check scheduling and target host settings" })
  @HttpCode(HttpStatus.OK)
  async saveSettings(@Body() settings: SeoAuditSettings) {
    if (!settings) {
      return { success: false, message: "Settings payload is required." };
    }

    if (settings.schedule && !["daily", "weekly", "disabled"].includes(settings.schedule)) {
      return { success: false, message: "Invalid schedule option selected." };
    }

    this.seoAuditService.saveSettings(settings);
    this.logger.log(`SEO settings updated by administrator: schedule=${settings.schedule}`);
    return {
      success: true,
      message: "SEO settings saved successfully.",
      settings,
    };
  }
}
