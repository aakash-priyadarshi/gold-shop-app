import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  BulkUpdateLeadStatusDto,
  GetLeadsFilterDto,
  ImportLeadsDto,
  PreviewOutreachDto,
  SendOutreachCampaignDto,
  UpdateLeadDto,
} from "./dto/lead.dto";
import { LeadsOutreachService } from "./leads-outreach.service";
import { LeadsService } from "./leads.service";

@ApiTags("Leads Management")
@Controller("leads")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@ApiBearerAuth()
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly outreachService: LeadsOutreachService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Admin — get paginated leads with filters and statistics" })
  async getLeads(@Query() filter: GetLeadsFilterDto) {
    return this.leadsService.getLeads(filter);
  }

  @Post("import")
  @ApiOperation({ summary: "Admin — bulk import leads from scraper or file" })
  async importLeads(@Body() dto: ImportLeadsDto) {
    return this.leadsService.importLeads(dto);
  }

  @Patch("bulk/status")
  @ApiOperation({ summary: "Admin — bulk update status for multiple leads" })
  async bulkUpdateStatus(@Body() dto: BulkUpdateLeadStatusDto) {
    return this.leadsService.bulkUpdateStatus(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Admin — update a single lead" })
  async updateLead(@Param("id") id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.updateLead(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Admin — delete a lead" })
  async deleteLead(@Param("id") id: string) {
    return this.leadsService.deleteLead(id);
  }

  @Get("outreach/presets")
  @ApiOperation({ summary: "Admin — get outreach email template presets" })
  getPresets() {
    return { templates: this.leadsService.getOutreachPresets() };
  }

  @Get("outreach/festivals")
  @ApiOperation({ summary: "Admin — get upcoming regional festivals for campaigns" })
  async getFestivals(@Query("country") country?: string) {
    const festivals = await this.outreachService.getUpcomingFestivals(country || "NP");
    return { festivals };
  }

  @Post("outreach/preview")
  @ApiOperation({ summary: "Admin — preview a rendered outreach email" })
  async previewOutreach(@Body() dto: PreviewOutreachDto) {
    return this.outreachService.previewOutreach(dto);
  }

  @Post("outreach/send")
  @ApiOperation({ summary: "Admin — bulk send cold outreach campaign via Resend" })
  async sendOutreach(@Body() dto: SendOutreachCampaignDto) {
    return this.outreachService.sendOutreach(dto);
  }
}
