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
} from "@nestjs/common";
import { AIAgentService } from "./ai-agent.service";
import { Roles } from "../../auth/roles.decorator";

@Controller("ai-sales")
export class AIAgentController {
  constructor(private svc: AIAgentService) {}

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
}
