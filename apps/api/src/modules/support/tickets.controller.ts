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
import { SkipSecurity } from "../security/security.guard";
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
  @SkipSecurity()
  @ApiOperation({ summary: "Get active global support contacts (public)" })
  async getPublicContacts() {
    return this.supportService.getGlobalContacts(true);
  }

  // ─── Public: AI Chatbot (no auth required) ───
  @Post("ai-chat")
  @SkipSecurity()
  @ApiOperation({ summary: "AI chatbot for basic support queries (public)" })
  async aiChat(
    @Req() req: any,
    @Body()
    body: {
      message: string;
      sessionId?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    },
  ) {
    const userAgent = req.headers?.["user-agent"] as string | undefined;
    return this.aiChatbot.chat(
      body.message,
      body.history || [],
      req.ip,
      body.sessionId,
      userAgent,
    );
  }

  // ─── Authenticated: Seller-aware AI Chatbot ───
  @Post("seller-chat")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Seller-aware AI chatbot — includes shop metrics in context" })
  async sellerChat(
    @Req() req: any,
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body()
    body: {
      message: string;
      sessionId?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    },
  ) {
    return this.aiChatbot.sellerChat(
      shopId,
      userId,
      body.message,
      body.history || [],
      req.ip,
      body.sessionId,
    );
  }

  // ─── Admin: Bot conversation sessions list ───
  @Get("ai-chat/sessions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin — paginated list of bot chat sessions" })
  async getBotSessions(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.supportService.getBotSessions(page, limit);
  }

  // ─── Admin: Bot conversation stats (for investor dashboard) ───
  @Get("ai-chat/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin — aggregate bot stats (sessions, intents, daily trend)" })
  async getBotStats() {
    return this.supportService.getBotStats();
  }

  // ─── Public: Create ticket (guest — no auth required) ───
  @Post("guest")
  @SkipSecurity()
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

  // ─── Staff: Send direct message to user (Create Ticket on behalf) ───
  @Post("admin/user/:userId/message")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPPORT", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send a direct message to a user (Admin/Support)" })
  async sendMessageToUser(
    @Param("userId") targetUserId: string,
    @CurrentUser("id") staffId: string,
    @Body() dto: { subject: string; message: string },
  ) {
    // Admin creates ticket
    const ticket = await this.ticketsService.createTicket(
      {
        type: TicketType.OTHER,
        subject: dto.subject,
        description: dto.message,
      },
      targetUserId, // the ticket belongs to the user
      "USER"
    );

    // Auto claim it by the sender
    await this.ticketsService.claimTicket(ticket.id, staffId);

    // Provide the admin's initial message
    return this.ticketsService.addMessage(
      ticket.id,
      staffId,
      "ADMIN",
      "Support Team",
      { content: dto.message }
    );
  }
}
