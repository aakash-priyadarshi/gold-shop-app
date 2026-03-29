import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
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

    // SHOPKEEPER: can initiate conversation with a buyer who has orders
    if (userRole === "SHOPKEEPER") {
      if (!dto.buyerId) {
        throw new BadRequestException(
          "buyerId is required for shopkeeper-initiated conversations",
        );
      }
      // Verify the shop belongs to this user
      const shop = await this.chatService.findShopByOwner(userId);
      if (!shop || shop.id !== dto.shopId) {
        throw new ForbiddenException("Shop does not belong to you");
      }
      // Verify the buyer has at least one order with this shop
      const hasOrder = await this.chatService.buyerHasOrderWithShop(
        dto.buyerId,
        dto.shopId,
      );
      if (!hasOrder) {
        throw new ForbiddenException(
          "You can only message customers who have placed orders with your shop",
        );
      }
      return this.chatService.getOrCreateConversation(
        dto.buyerId,
        dto.shopId,
        dto.orderId,
        dto.rfqId,
      );
    }

    throw new Error("Cannot initiate conversations with this role");
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

  @Post("admin/start-user-chat")
  @Roles("ADMIN", "SUPPORT")
  @ApiOperation({ summary: "Admin creates a support conversation with any user" })
  async startUserChat(
    @CurrentUser("id") adminId: string,
    @Body() dto: { targetUserId: string },
  ) {
    return this.chatService.createAdminToUserConversation(adminId, dto.targetUserId);
  }

  @Post("admin/generate-draft")
  @Roles("ADMIN", "SUPPORT")
  @ApiOperation({ summary: "AI generate message draft" })
  async generateAdminDraft(
    @CurrentUser("id") adminId: string,
    @Body() dto: { prompt: string; context?: string },
  ) {
    const text = await this.chatService.generateAiMessageDraft(adminId, dto.prompt, dto.context);
    return { text };
  }

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

  // ─── Catalogue & Product Sharing (Seller only) ─────────────────────

  @Post("conversations/:id/share-catalogue")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Share a catalogue link in conversation" })
  async shareCatalogue(
    @Param("id") conversationId: string,
    @CurrentUser("id") userId: string,
    @Body() body: { catalogueSlug: string; mode?: string },
  ) {
    return this.chatService.shareCatalogueInConversation(
      conversationId,
      userId,
      body.catalogueSlug,
      body.mode,
    );
  }

  @Post("conversations/:id/share-products")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Share product cards in conversation" })
  async shareProducts(
    @Param("id") conversationId: string,
    @CurrentUser("id") userId: string,
    @Body() body: { items: { inventoryItemId: string; variantId?: string }[] },
  ) {
    return this.chatService.shareProductsInConversation(
      conversationId,
      userId,
      body.items,
    );
  }

  @Post("conversations/:id/walk-in-rfq")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Create a walk-in RFQ from conversation" })
  async createWalkInRfqFromChat(
    @Param("id") conversationId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") shopId: string,
    @Body()
    body: {
      catalogueSlug?: string;
      items: { inventoryItemId: string; variantId?: string; qty?: number }[];
      jewelleryType?: string;
      budgetMin?: number;
      budgetMax?: number;
      deadlineDays?: number;
      notes?: string;
      measurements?: any;
      walkInCustomer?: { name?: string; phone?: string; notes?: string };
    },
  ) {
    return this.chatService.createWalkInRfqFromChat(
      conversationId,
      userId,
      shopId,
      body,
    );
  }
}
