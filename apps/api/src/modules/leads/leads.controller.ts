import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MessageSender } from "@prisma/client";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  BulkUpdateLeadStatusDto,
  GetLeadsFilterDto,
  ImportLeadsDto,
  PreviewOutreachDto,
  SendOutreachCampaignDto,
  SendWhatsAppCampaignDto,
  SendWhatsAppMessageDto,
  ToggleAiBotDto,
  UpdateLeadDto,
} from "./dto/lead.dto";
import { LeadsOutreachService } from "./leads-outreach.service";
import { LeadsService } from "./leads.service";
import { LeadsWhatsAppService } from "./leads-whatsapp.service";

@ApiTags("Leads Management")
@Controller("leads")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@ApiBearerAuth()
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly outreachService: LeadsOutreachService,
    private readonly whatsAppService: LeadsWhatsAppService
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

  @Get(":id/messages")
  @ApiOperation({ summary: "Admin — get WhatsApp message thread for a lead" })
  async getLeadMessages(@Param("id") id: string) {
    return this.leadsService.getLeadMessages(id);
  }

  @Patch(":id/ai-bot")
  @ApiOperation({ summary: "Admin — toggle AI chatbot pause state for a lead" })
  async toggleAiBot(@Param("id") id: string, @Body() dto: ToggleAiBotDto) {
    return this.leadsService.toggleAiBot(id, dto.paused);
  }

  @Post(":id/whatsapp")
  @ApiOperation({ summary: "Admin — send manual WhatsApp reply to a lead via Twilio" })
  async sendManualWhatsApp(
    @Param("id") id: string,
    @Body() dto: SendWhatsAppMessageDto
  ) {
    return this.whatsAppService.sendMessage(id, dto.body, {
      mediaUrl: dto.mediaUrl,
      sender: MessageSender.ADMIN,
    });
  }

  @Post("whatsapp/campaign")
  @ApiOperation({ summary: "Admin — send bulk WhatsApp outreach campaign" })
  async sendWhatsAppCampaign(@Body() dto: SendWhatsAppCampaignDto) {
    return this.whatsAppService.sendCampaign(dto.leadIds, dto.templateText, {
      mediaUrl: dto.mediaUrl,
      festivalName: dto.festivalName,
    });
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

  @Post("whatsapp/webhook")
  @Public()
  @ApiOperation({ summary: "Twilio — incoming WhatsApp webhook receiver" })
  async handleTwilioWhatsAppWebhook(
    @Headers("x-twilio-signature") signature: string,
    @Req() req: any,
    @Body() payload: Record<string, any>
  ) {
    const proto = req.headers?.["x-forwarded-proto"] || (req.secure ? "https" : "http");
    const host = req.headers?.["x-forwarded-host"] || req.headers?.["host"];
    const requestUrl = `${proto}://${host}${req.originalUrl || req.url}`;

    const isValid = this.whatsAppService.validateWebhookSignature(
      signature,
      requestUrl,
      payload
    );
    if (!isValid) {
      throw new UnauthorizedException("Invalid or missing X-Twilio-Signature");
    }

    return this.whatsAppService.handleIncomingWebhook(payload);
  }
}

