import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { EnterpriseGuard } from "../guards/enterprise.guard";
import { BulkImportService } from "../services/bulk-import.service";

@ApiTags("enterprise/bulk")
@Controller("enterprise/bulk")
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseGuard)
@ApiBearerAuth()
export class BulkImportController {
  constructor(private readonly bulkImportService: BulkImportService) {}

  @Post("import")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Create a bulk import job" })
  async createImport(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() body: { importType: string; fileUrl: string },
  ) {
    return this.bulkImportService.createImportJob(shopId, userId, body);
  }

  @Get("imports")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "List import jobs" })
  async listImports(
    @CurrentUser("activeShopId") shopId: string,
    @Query("limit") limit?: string,
  ) {
    return this.bulkImportService.listImportJobs(shopId, limit ? parseInt(limit) : 20);
  }

  @Get("imports/:id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get import job status" })
  async getImport(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.bulkImportService.getImportJob(shopId, id);
  }

  @Patch("imports/:id/cancel")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Cancel a pending import job" })
  async cancelImport(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.bulkImportService.cancelImportJob(shopId, id);
  }

  @Get("export")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Export data as JSON" })
  async exportData(
    @CurrentUser("activeShopId") shopId: string,
    @Query("type") exportType: string,
  ) {
    return this.bulkImportService.exportData(shopId, exportType);
  }
}
