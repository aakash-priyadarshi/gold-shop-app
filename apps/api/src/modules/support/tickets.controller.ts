import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TicketPriority, TicketStatus, TicketType } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AiChatbotService } from "./ai-chatbot.service";
import { SupportService } from "./support.service";
import {
  AddTicketMessageDto,
  CreateTicketDto,
  TicketsService,
} from "./tickets.service";

// ─── Tickets Controller (under /tickets) ───
@ApiTags("tickets")
@Controller("tickets")
export class TicketsController {
  constructor(
    private ticketsService: TicketsService,
    private aiChatbot: AiChatbotService,
    private supportService: SupportService
  ) {}

  // ─── Public: Global Contacts ───
  @Get("contacts")
  @ApiOperation({ summary: "Get active global support contacts (public)" })
  async getPublicContacts() {
    return this.supportService.getGlobalContacts(true);
  }

  // ─── Public: AI Chatbot (no auth required) ───
  @Post("ai-chat")
  @ApiOperation({ summary: "AI chatbot for basic support queries (public)" })
  async aiChat(
    @Req() req: any,
    @Body()
    body: {
      message: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    },
  ) {
    return this.aiChatbot.chat(body.message, body.history || [], req.ip);
  }

  // ─── Public: Create ticket (guest — no auth required) ───
  @Post("guest")
  @ApiOperation({
    summary: "Create a support ticket (guest, no login required)",
  })
  async createGuestTicket(@Body() dto: CreateTicketDto) {
    return this.ticketsService.createTicket(dto);
  }

  // ─── Authenticated: Create ticket ───
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a support ticket (logged-in user)" })
  async createTicket(
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(dto, userId, role);
  }

  // ─── Authenticated: My tickets ───
  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get my support tickets" })
  async getMyTickets(
    @CurrentUser("id") userId: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.ticketsService.getMyTickets(userId, page, limit);
  }

  // ─── Authenticated: Get ticket detail ───
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get ticket details with messages" })
  async getTicket(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: string,
  ) {
    return this.ticketsService.getTicket(id, userId, role);
  }

  // ─── Authenticated: Add message to ticket ───
  @Post(":id/messages")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Add a message to a ticket" })
  async addMessage(
    @Param("id") ticketId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: string,
    @CurrentUser() user: any,
    @Body() dto: AddTicketMessageDto,
  ) {
    const senderName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
    return this.ticketsService.addMessage(
      ticketId,
      userId,
      role,
      senderName,
      dto,
    );
  }

  // ═══════════════════════════════════════════════
  //  SUPPORT / ADMIN only endpoints
  // ═══════════════════════════════════════════════

  // ─── Staff: List all tickets with filters ───
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPPORT", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all tickets (support/admin)" })
  async listTickets(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: TicketStatus,
    @Query("type") type?: TicketType,
    @Query("priority") priority?: TicketPriority,
    @Query("assigneeId") assigneeId?: string,
    @Query("search") search?: string,
  ) {
    return this.ticketsService.listTickets({
      page,
      limit,
      status,
      type,
      priority,
      assigneeId,
      search,
    });
  }

  // ─── Staff: Claim a ticket ───
  @Patch(":id/claim")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPPORT", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Claim a ticket (support/admin)" })
  async claimTicket(
    @Param("id") id: string,
    @CurrentUser("id") staffId: string,
  ) {
    return this.ticketsService.claimTicket(id, staffId);
  }

  // ─── Staff: Update ticket status ───
  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPPORT", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update ticket status (support/admin)" })
  async updateStatus(
    @Param("id") id: string,
    @CurrentUser("id") staffId: string,
    @Body() body: { status: TicketStatus; note?: string },
  ) {
    return this.ticketsService.updateTicketStatus(
      id,
      body.status,
      staffId,
      body.note,
    );
  }

  // ─── Staff: Resolve ticket ───
  @Patch(":id/resolve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPPORT", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Resolve a ticket" })
  async resolveTicket(
    @Param("id") id: string,
    @CurrentUser("id") staffId: string,
    @Body() body: { note?: string },
  ) {
    return this.ticketsService.resolveTicket(id, staffId, body.note);
  }

  // ─── Staff: Close ticket ───
  @Patch(":id/close")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPPORT", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Close a ticket" })
  async closeTicket(
    @Param("id") id: string,
    @CurrentUser("id") staffId: string,
  ) {
    return this.ticketsService.closeTicket(id, staffId);
  }

  // ─── Staff: Ticket stats ───
  @Get("stats/overview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPPORT", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get ticket statistics overview" })
  async getTicketStats() {
    return this.ticketsService.getTicketStats();
  }
}
