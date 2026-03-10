import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Header,
} from "@nestjs/common";
import { AIAgentService } from "./ai-agent.service";
import { Roles } from "../../auth/roles.decorator";
import { CampaignSchedulerService } from "./services/campaign-scheduler.service";
import { CallOrchestratorService } from "./services/call-orchestrator.service";
import { LeadScoringService } from "./services/lead-scoring.service";
import { ConfigService } from "@nestjs/config";

@Controller("ai-sales")
export class AIAgentController {
  constructor(
    private svc: AIAgentService,
    private campaigns: CampaignSchedulerService,
    private calls: CallOrchestratorService,
    private scoring: LeadScoringService,
    private config: ConfigService,
  ) {}

  /* ─── AGENTS ─── */

  @Post("agents")
  @Roles("ADMIN")
  createAgent(@Body() body: any) {
    return this.svc.createAgent(body);
  }

  @Get("agents")
  listAgents() {
    return this.svc.listAgents();
  }

  @Get("agents/:id")
  getAgent(@Param("id") id: string) {
    return this.svc.getAgent(id);
  }

  @Put("agents/:id")
  @Roles("ADMIN")
  updateAgent(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateAgent(id, body);
  }

  @Patch("agents/:id/toggle")
  @Roles("ADMIN")
  toggleAgent(@Param("id") id: string, @Body() body: { isActive: boolean }) {
    return this.svc.toggleAgent(id, body.isActive);
  }

  /* ─── SCRIPTS ─── */

  @Post("scripts")
  @Roles("ADMIN")
  createScript(@Body() body: any) {
    return this.svc.createScript(body);
  }

  @Get("agents/:agentId/scripts")
  listScripts(@Param("agentId") agentId: string) {
    return this.svc.listScripts(agentId);
  }

  @Get("scripts")
  listAllScripts() {
    return this.svc.listScripts();
  }

  @Put("scripts/:id")
  @Roles("ADMIN")
  updateScript(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateScript(id, body);
  }

  @Delete("scripts/:id")
  @Roles("ADMIN")
  deleteScript(@Param("id") id: string) {
    return this.svc.deleteScript(id);
  }

  /* ─── LEADS ─── */

  @Post("leads")
  createLead(@Body() body: any) {
    return this.svc.createLead(body);
  }

  @Get("leads")
  listLeads(
    @Query("stage") stage?: string,
    @Query("source") source?: string,
    @Query("assignedToId") assignedToId?: string,
    @Query("search") search?: string,
  ) {
    return this.svc.listLeads({ stage, source, assignedToId, search });
  }

  @Get("leads/pipeline")
  getLeadPipeline() {
    return this.svc.getLeadPipeline();
  }

  @Put("leads/:id")
  updateLead(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateLead(id, body);
  }

  @Patch("leads/:id/stage")
  moveLeadStage(@Param("id") id: string, @Body() body: { stage: string }) {
    return this.svc.moveLeadStage(id, body.stage);
  }

  /* ─── CALLS ─── */

  @Post("calls")
  createCall(@Body() body: any) {
    return this.svc.createCall(body);
  }

  @Get("calls")
  listCalls(
    @Query("agentId") agentId?: string,
    @Query("leadId") leadId?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.listCalls({ agentId, leadId, status });
  }

  @Get("calls/stats")
  getCallStats() {
    return this.svc.getCallStats();
  }

  @Patch("calls/:id/end")
  endCall(@Param("id") id: string, @Body() body: any) {
    return this.svc.endCall(id, body);
  }

  /* ─── PRODUCTS ─── */

  @Post("products")
  @Roles("ADMIN")
  createProduct(@Body() body: any) {
    return this.svc.createProduct(body);
  }

  @Get("products")
  listProducts() {
    return this.svc.listProducts();
  }

  @Put("products/:id")
  @Roles("ADMIN")
  updateProduct(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateProduct(id, body);
  }

  @Delete("products/:id")
  @Roles("ADMIN")
  deleteProduct(@Param("id") id: string) {
    return this.svc.deleteProduct(id);
  }

  /* ─── OBJECTIONS ─── */

  @Post("objections")
  @Roles("ADMIN")
  createObjection(@Body() body: any) {
    return this.svc.createObjection(body);
  }

  @Get("objections")
  listObjections(@Query("category") category?: string) {
    return this.svc.listObjections(category);
  }

  @Put("objections/:id")
  @Roles("ADMIN")
  updateObjection(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateObjection(id, body);
  }

  @Delete("objections/:id")
  @Roles("ADMIN")
  deleteObjection(@Param("id") id: string) {
    return this.svc.deleteObjection(id);
  }

  /* ─── CAMPAIGNS ─── */

  @Post("campaigns")
  @Roles("ADMIN")
  createCampaign(@Body() body: any) {
    return this.campaigns.createCampaign(body);
  }

  @Get("campaigns")
  listCampaigns(@Query("status") status?: string) {
    return this.campaigns.listCampaigns(status);
  }

  @Get("campaigns/:id")
  getCampaign(@Param("id") id: string) {
    return this.campaigns.getCampaign(id);
  }

  @Put("campaigns/:id")
  @Roles("ADMIN")
  updateCampaign(@Param("id") id: string, @Body() body: any) {
    return this.campaigns.updateCampaign(id, body);
  }

  @Post("campaigns/:id/leads")
  @Roles("ADMIN")
  addLeadsToCampaign(@Param("id") id: string, @Body() body: { leadIds: string[] }) {
    return this.campaigns.addLeadsToCampaign(id, body.leadIds);
  }

  @Delete("campaigns/:id/leads/:leadId")
  @Roles("ADMIN")
  removeLeadFromCampaign(@Param("id") id: string, @Param("leadId") leadId: string) {
    return this.campaigns.removeLeadFromCampaign(id, leadId);
  }

  @Post("campaigns/:id/start")
  @Roles("ADMIN")
  startCampaign(@Param("id") id: string) {
    const webhookBaseUrl = this.config.get("WEBHOOK_BASE_URL") || "https://team-api.orivraa.com";
    return this.campaigns.startCampaign(id, webhookBaseUrl);
  }

  @Post("campaigns/:id/pause")
  @Roles("ADMIN")
  pauseCampaign(@Param("id") id: string) {
    return this.campaigns.pauseCampaign(id);
  }

  @Get("campaigns/:id/stats")
  getCampaignStats(@Param("id") id: string) {
    return this.campaigns.getCampaignStats(id);
  }

  /* ─── CALL ORCHESTRATOR ─── */

  @Post("calls/initiate")
  @Roles("ADMIN")
  initiateCall(@Body() body: { agentId: string; leadId: string; campaignId?: string }) {
    const webhookBaseUrl = this.config.get("WEBHOOK_BASE_URL") || "https://team-api.orivraa.com";
    return this.calls.initiateCall({ ...body, webhookBaseUrl });
  }

  @Get("calls/active-count")
  getActiveCallsCount() {
    return this.calls.getActiveCalls();
  }

  @Get("calls/detailed-stats")
  getDetailedCallStats(@Query("from") from?: string, @Query("to") to?: string) {
    const dateRange = from && to ? { from: new Date(from), to: new Date(to) } : undefined;
    return this.calls.getDetailedStats(dateRange);
  }

  /* ─── LEAD SCORING ─── */

  @Get("leads/:id/score")
  getLeadScore(@Param("id") id: string) {
    return this.scoring.scoreLeead(id);
  }

  @Post("leads/bulk-score")
  @Roles("ADMIN")
  bulkScoreLeads() {
    return this.scoring.bulkScoreLeads();
  }

  /* ─── SCHEDULES ─── */

  @Post("schedules")
  createSchedule(@Body() body: any) {
    return this.svc.createSchedule(body);
  }

  @Get("schedules")
  listSchedules(@Query("agentId") agentId?: string, @Query("status") status?: string) {
    return this.svc.listSchedules({ agentId, status });
  }

  @Put("schedules/:id")
  updateSchedule(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateSchedule(id, body);
  }

  @Delete("schedules/:id")
  deleteSchedule(@Param("id") id: string) {
    return this.svc.deleteSchedule(id);
  }

  /* ─── ANALYTICS ─── */

  @Get("analytics/dashboard")
  getAnalyticsDashboard() {
    return this.svc.getAnalyticsDashboard();
  }

  /* ─── TWILIO WEBHOOKS ─── */

  @Post("twilio/voice/:sessionId")
  @Header("Content-Type", "text/xml")
  handleTwilioVoice(@Param("sessionId") sessionId: string) {
    const wsBaseUrl = (this.config.get("WEBHOOK_BASE_URL") || "https://team-api.orivraa.com").replace("https://", "wss://").replace("http://", "ws://");
    return this.calls.generateTwiML(sessionId, wsBaseUrl);
  }

  @Post("twilio/status/:sessionId")
  handleTwilioStatus(
    @Param("sessionId") sessionId: string,
    @Body() body: { CallStatus: string; CallSid: string },
  ) {
    return this.calls.handleStatusCallback(sessionId, body.CallStatus, body.CallSid);
  }
}
