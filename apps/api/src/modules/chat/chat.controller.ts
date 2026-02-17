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
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ChatService } from "./chat.service";
import { CreateConversationDto, SendMessageDto } from "./dto/chat.dto";

@ApiTags("chat")
@Controller("chat")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ─── Conversations ───

  @Post("conversations")
  @Roles("CUSTOMER", "SHOPKEEPER", "ADMIN", "SALES")
  @ApiOperation({ summary: "Create or get existing conversation" })
  async createConversation(
    @CurrentUser("id") userId: string,
    @CurrentUser("role") userRole: string,
    @Body() dto: CreateConversationDto,
  ) {
    if (
      userRole === "CUSTOMER" ||
      userRole === "ADMIN" ||
      userRole === "SALES"
    ) {
      return this.chatService.getOrCreateConversation(
        userId,
        dto.shopId,
        dto.orderId,
        dto.rfqId,
      );
    }
    throw new Error(
      "Shopkeepers cannot initiate conversations — customers contact you first",
    );
  }

  @Get("conversations")
  @Roles("CUSTOMER", "SHOPKEEPER", "ADMIN", "SUPPORT", "SALES")
  @ApiOperation({ summary: "List conversations for current user" })
  async listConversations(
    @CurrentUser("id") userId: string,
    @CurrentUser("role") userRole: string,
    @Query("shopId") shopId?: string,
  ) {
    return this.chatService.listConversations(userId, userRole, shopId);
  }

  @Get("conversations/:id/messages")
  @Roles("CUSTOMER", "SHOPKEEPER", "ADMIN", "SUPPORT", "SALES")
  @ApiOperation({ summary: "Get messages in a conversation (paginated)" })
  async getMessages(
    @CurrentUser("id") userId: string,
    @CurrentUser("role") userRole: string,
    @Param("id") conversationId: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getMessages(
      conversationId,
      userId,
      userRole,
      page,
      limit,
    );
  }

  @Post("conversations/:id/messages")
  @Roles("CUSTOMER", "SHOPKEEPER", "ADMIN", "SALES")
  @ApiOperation({
    summary: "Send a message (blocked if contact info detected)",
  })
  async sendMessage(
    @CurrentUser("id") userId: string,
    @CurrentUser("role") userRole: string,
    @Param("id") conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(
      conversationId,
      userId,
      userRole,
      dto.content,
      dto.attachmentUrl,
      dto.attachmentType,
    );
  }

  @Patch("conversations/:id/read")
  @Roles("CUSTOMER", "SHOPKEEPER", "ADMIN", "SUPPORT", "SALES")
  @ApiOperation({ summary: "Mark all messages in a conversation as read" })
  async markAsRead(
    @CurrentUser("id") userId: string,
    @Param("id") conversationId: string,
  ) {
    await this.chatService.markAsRead(conversationId, userId);
    return { success: true };
  }

  // ─── Admin / Support ───

  @Get("admin/violations")
  @Roles("ADMIN", "SUPPORT")
  @ApiOperation({
    summary: "Get contact violation statistics and recent violations",
  })
  async getViolationStats() {
    return this.chatService.getViolationStats();
  }

  @Get("admin/violations/user/:userId")
  @Roles("ADMIN", "SUPPORT")
  @ApiOperation({ summary: "Get per-user violation history" })
  async getUserViolationHistory(@Param("userId") userId: string) {
    return this.chatService.getUserViolationHistory(userId);
  }

  @Get("admin/messages/:messageId")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get original blocked message (admin review)" })
  async getBlockedMessage(@Param("messageId") messageId: string) {
    return this.chatService.getBlockedMessageOriginal(messageId);
  }

  @Patch("admin/conversations/:id/unlock")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Unlock a locked conversation" })
  async unlockConversation(
    @CurrentUser("id") adminId: string,
    @Param("id") conversationId: string,
  ) {
    await this.chatService.unlockConversation(conversationId, adminId);
    return { success: true };
  }

  @Patch("admin/users/:userId/unblock")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Unblock a user suspended for chat violations" })
  async unblockUser(
    @CurrentUser("id") adminId: string,
    @Param("userId") userId: string,
  ) {
    return this.chatService.unblockUser(userId, adminId);
  }
}
