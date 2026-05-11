import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseBoolPipe,
    Patch,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('unreadOnly', new ParseBoolPipe({ optional: true })) unreadOnly = false,
  ) {
    return this.notificationsService.findAllForUser(userId, unreadOnly);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get('test/scenarios')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: list manual notification test scenarios' })
  async getTestScenarios() {
    return this.notificationsService.getTestScenarios();
  }

  @Patch('test/send')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin: send a manual test notification' })
  async sendTestNotification(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      scenario: any;
      targetRole?: 'ADMIN' | 'SHOPKEEPER';
    },
  ) {
    return this.notificationsService.createTestNotification(
      userId,
      body.scenario,
      body.targetRole,
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.notificationsService.markAsRead(id, userId);
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification for current user' })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.notificationsService.deleteForUser(id, userId);
    return { success: true };
  }
}
