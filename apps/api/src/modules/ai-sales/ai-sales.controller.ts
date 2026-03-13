import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AiSalesService } from "./ai-sales.service";
import {
  CreateLeadDto,
  EndCallDto,
  InitiateCallDto,
  CreateAgentVoiceDto,
  MoveLeadStageDto,
  UpdateLeadDto,
  SendEmailDto,
  DraftEmailDto,
  InboundEmailDto,
  ScheduleMeetDto,
  RecordInteractionDto,
} from "./dto/ai-sales.dto";

// ── Leads Controller ──────────────────────────────────────────

@ApiTags("ai-sales-leads")
@Controller("ai-sales/leads")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiSalesLeadsController {
  constructor(private svc: AiSalesService) {}

  @Get()
  @ApiOperation({ summary: "List leads" })
  listLeads(
    @CurrentUser("shopId") shopId: string,
    @Query() params: Record<string, string>,
  ) {
    return this.svc.listLeads(shopId, params);
  }

  @Get("pipeline")
  @ApiOperation({ summary: "Get lead pipeline by stage" })
  getLeadPipeline(@CurrentUser("shopId") shopId: string) {
    return this.svc.getLeadPipeline(shopId);
  }

  @Post("bulk-score")
  @ApiOperation({ summary: "Bulk score all leads" })
  bulkScoreLeads(@CurrentUser("shopId") shopId: string) {
    return this.svc.bulkScoreLeads(shopId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get lead detail" })
  getLead(@CurrentUser("shopId") shopId: string, @Param("id") id: string) {
    return this.svc.getLead(shopId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create lead" })
  createLead(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.svc.createLead(shopId, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update lead" })
  updateLead(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.svc.updateLead(shopId, id, dto);
  }

  @Patch(":id/stage")
  @ApiOperation({ summary: "Move lead to a different stage" })
  moveLeadStage(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: MoveLeadStageDto,
  ) {
    return this.svc.moveLeadStage(shopId, id, dto.stage);
  }

  @Get(":id/score")
  @ApiOperation({ summary: "Get/calculate lead score" })
  getLeadScore(@CurrentUser("shopId") shopId: string, @Param("id") id: string) {
    return this.svc.getLeadScore(shopId, id);
  }

  @Get(":id/interactions")
  @ApiOperation({ summary: "Get lead interaction timeline" })
  getLeadInteractions(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Query("limit") limit?: string,
  ) {
    return this.svc.getLeadInteractions(shopId, id, limit ? parseInt(limit) : 20);
  }

  @Get(":id/interaction-stats")
  @ApiOperation({ summary: "Get lead interaction stats" })
  getLeadInteractionStats(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.svc.getLeadInteractionStats(shopId, id);
  }

  @Post(":id/interactions")
  @ApiOperation({ summary: "Record a manual interaction" })
  recordInteraction(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: RecordInteractionDto,
  ) {
    return this.svc.recordInteraction(shopId, id, dto);
  }

  @Get(":id/emails")
  @ApiOperation({ summary: "Get lead emails" })
  getLeadEmails(@CurrentUser("shopId") shopId: string, @Param("id") id: string) {
    return this.svc.getLeadEmails(shopId, id);
  }
}

// ── Calls Controller ──────────────────────────────────────────

@ApiTags("ai-sales-calls")
@Controller("ai-sales/calls")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiSalesCallsController {
  constructor(private svc: AiSalesService) {}

  @Get()
  @ApiOperation({ summary: "List call sessions" })
  listCalls(
    @CurrentUser("shopId") shopId: string,
    @Query() params: Record<string, string>,
  ) {
    return this.svc.listCalls(shopId, params);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get call statistics" })
  getCallStats(@CurrentUser("shopId") shopId: string) {
    return this.svc.getCallStats(shopId);
  }

  @Get("detailed-stats")
  @ApiOperation({ summary: "Get detailed call statistics" })
  getDetailedCallStats(
    @CurrentUser("shopId") shopId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.svc.getDetailedCallStats(shopId, from, to);
  }

  @Get("active-count")
  @ApiOperation({ summary: "Get active calls count" })
  getActiveCallsCount(@CurrentUser("shopId") shopId: string) {
    return this.svc.getActiveCallsCount(shopId);
  }

  @Post("initiate")
  @ApiOperation({ summary: "Initiate an AI call" })
  initiateCall(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: InitiateCallDto,
  ) {
    return this.svc.initiateCall(shopId, dto);
  }

  @Patch(":id/end")
  @ApiOperation({ summary: "End a call and save AI insights" })
  endCall(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: EndCallDto,
  ) {
    return this.svc.endCall(shopId, id, dto);
  }
}

// ── Agent Voices Controller ───────────────────────────────────

@ApiTags("ai-sales-voices")
@Controller("ai-sales/voices")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiSalesVoicesController {
  constructor(private svc: AiSalesService) {}

  @Get()
  @ApiOperation({ summary: "List AI voice agents" })
  listVoices(@CurrentUser("shopId") shopId: string) {
    return this.svc.listVoices(shopId);
  }

  @Post()
  @ApiOperation({ summary: "Create AI voice agent" })
  createVoice(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: CreateAgentVoiceDto,
  ) {
    return this.svc.createVoice(shopId, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update AI voice agent" })
  updateVoice(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: Partial<CreateAgentVoiceDto>,
  ) {
    return this.svc.updateVoice(shopId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete AI voice agent" })
  deleteVoice(@CurrentUser("shopId") shopId: string, @Param("id") id: string) {
    return this.svc.deleteVoice(shopId, id);
  }

  @Post("seed")
  @ApiOperation({ summary: "Seed default voice agents" })
  seedVoices(@CurrentUser("shopId") shopId: string) {
    return this.svc.seedVoices(shopId);
  }
}

// ── Email Controller ──────────────────────────────────────────

@ApiTags("ai-sales-email")
@Controller("ai-sales/email")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiSalesEmailController {
  constructor(private svc: AiSalesService) {}

  @Post("send")
  @ApiOperation({ summary: "Send email to a lead" })
  sendEmail(@CurrentUser("shopId") shopId: string, @Body() dto: SendEmailDto) {
    return this.svc.sendEmail(shopId, dto);
  }

  @Post("draft")
  @ApiOperation({ summary: "Generate AI email draft" })
  generateEmailDraft(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: DraftEmailDto,
  ) {
    return this.svc.generateEmailDraft(shopId, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get email detail" })
  getEmailDetail(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.svc.getEmailDetail(shopId, id);
  }
}

// ── Inbound Email Webhook (no auth — external webhook) ────────

@ApiTags("ai-sales-email")
@Controller("ai-sales/email")
export class AiSalesEmailWebhookController {
  constructor(private svc: AiSalesService) {}

  @Post("inbound")
  @ApiOperation({ summary: "Inbound email webhook (no auth)" })
  processInboundEmail(@Body() dto: InboundEmailDto) {
    return this.svc.processInboundEmail(dto);
  }
}

// ── Meet Controller ───────────────────────────────────────────

@ApiTags("ai-sales-meet")
@Controller("ai-sales/meet")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiSalesMeetController {
  constructor(private svc: AiSalesService) {}

  @Post("schedule")
  @ApiOperation({ summary: "Schedule a Google Meet with a lead" })
  scheduleMeet(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: ScheduleMeetDto,
  ) {
    return this.svc.scheduleMeet(shopId, dto);
  }
}
