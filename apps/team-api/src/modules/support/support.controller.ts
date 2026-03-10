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
import { SupportService } from "./support.service";
import { Roles } from "../../auth/roles.decorator";
import { CurrentUser } from "../../auth/current-user.decorator";

@Controller("support")
export class SupportController {
  constructor(private svc: SupportService) {}

  /* ─── TICKETS ─── */

  @Post("tickets")
  createTicket(@Body() body: any) {
    return this.svc.createTicket(body);
  }

  @Get("tickets")
  listTickets(
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("channel") channel?: string,
    @Query("search") search?: string,
  ) {
    return this.svc.listTickets({ status, priority, assigneeId, channel, search });
  }

  @Get("tickets/:id")
  getTicket(@Param("id") id: string) {
    return this.svc.getTicket(id);
  }

  @Put("tickets/:id")
  updateTicket(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateTicket(id, body);
  }

  @Patch("tickets/:id/assign")
  assignTicket(@Param("id") id: string, @Body() body: { assignedToId: string }) {
    return this.svc.assignTicket(id, body.assignedToId);
  }

  @Patch("tickets/:id/resolve")
  resolveTicket(@Param("id") id: string) {
    return this.svc.resolveTicket(id);
  }

  @Patch("tickets/:id/close")
  closeTicket(@Param("id") id: string) {
    return this.svc.closeTicket(id);
  }

  @Patch("tickets/:id/reopen")
  reopenTicket(@Param("id") id: string) {
    return this.svc.reopenTicket(id);
  }

  /* ─── MESSAGES ─── */

  @Post("tickets/:ticketId/messages")
  addMessage(@Param("ticketId") ticketId: string, @Body() body: any) {
    return this.svc.addMessage(ticketId, body);
  }

  @Get("tickets/:ticketId/messages")
  getMessages(@Param("ticketId") ticketId: string) {
    return this.svc.getMessages(ticketId);
  }

  /* ─── KNOWLEDGE BASE ─── */

  @Post("knowledge")
  @Roles("ADMIN")
  createArticle(@Body() body: any) {
    return this.svc.createArticle(body);
  }

  @Get("knowledge")
  listArticles(
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("published") published?: string,
  ) {
    return this.svc.listArticles({
      category,
      search,
      published: published !== undefined ? published === "true" : undefined,
    });
  }

  @Get("knowledge/:id")
  getArticle(@Param("id") id: string) {
    return this.svc.getArticle(id);
  }

  @Put("knowledge/:id")
  @Roles("ADMIN")
  updateArticle(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateArticle(id, body);
  }

  @Delete("knowledge/:id")
  @Roles("ADMIN")
  deleteArticle(@Param("id") id: string) {
    return this.svc.deleteArticle(id);
  }

  /* ─── CANNED RESPONSES ─── */

  @Post("canned")
  @Roles("ADMIN")
  createCannedResponse(@Body() body: any) {
    return this.svc.createCannedResponse(body);
  }

  @Get("canned")
  listCannedResponses(@Query("category") category?: string) {
    return this.svc.listCannedResponses(category);
  }

  @Patch("canned/:id/use")
  useCannedResponse(@Param("id") id: string) {
    return this.svc.useCannedResponse(id);
  }

  @Delete("canned/:id")
  @Roles("ADMIN")
  deleteCannedResponse(@Param("id") id: string) {
    return this.svc.deleteCannedResponse(id);
  }

  /* ─── DASHBOARD ─── */

  @Get("dashboard")
  getDashboard() {
    return this.svc.getDashboard();
  }
}
