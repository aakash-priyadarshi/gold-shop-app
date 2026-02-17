import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateConversationDto, SendMessageDto } from './dto/chat.dto';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ─── Conversations ───

  @Post('conversations')
  @Roles('CUSTOMER', 'SHOPKEEPER')
  @ApiOperation({ summary: 'Create or get existing conversation' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateConversationDto,
  ) {
    // Customers are always the buyer
    if (userRole === 'CUSTOMER') {
      return this.chatService.getOrCreateConversation(
        userId,
        dto.shopId,
        dto.orderId,
        dto.rfqId,
      );
    }
    // Shopkeepers need a buyerId from context (order or rfq)
    throw new Error('Shopkeepers should use order/rfq context to start conversations');
  }

  @Get('conversations')
  @Roles('CUSTOMER', 'SHOPKEEPER', 'ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'List conversations for current user' })
  async listConversations(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.chatService.listConversations(userId, userRole, shopId);
  }

  @Get('conversations/:id/messages')
  @Roles('CUSTOMER', 'SHOPKEEPER', 'ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Get messages in a conversation (paginated)' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') conversationId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getMessages(conversationId, userId, userRole, page, limit);
  }

  @Post('conversations/:id/messages')
  @Roles('CUSTOMER', 'SHOPKEEPER')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') conversationId: string,
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

  @Patch('conversations/:id/read')
  @Roles('CUSTOMER', 'SHOPKEEPER', 'ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    await this.chatService.markAsRead(conversationId, userId);
    return { success: true };
  }

  // ─── Admin / Support ───

  @Get('admin/violations')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Get contact violation statistics' })
  async getViolationStats() {
    return this.chatService.getViolationStats();
  }

  @Patch('admin/conversations/:id/unlock')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Unlock a locked conversation' })
  async unlockConversation(
    @CurrentUser('id') adminId: string,
    @Param('id') conversationId: string,
  ) {
    await this.chatService.unlockConversation(conversationId, adminId);
    return { success: true };
  }
}
