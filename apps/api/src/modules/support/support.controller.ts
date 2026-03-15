import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('support')
@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPPORT', 'ADMIN')
@ApiBearerAuth()
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get support dashboard overview stats' })
  async getDashboard() {
    return this.supportService.getDashboardStats();
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get orders queue for support review' })
  async getOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.supportService.getOrdersQueue(page, limit, status);
  }

  @Get('flagged-conversations')
  @ApiOperation({ summary: 'Get flagged conversations (locked or with violations)' })
  async getFlaggedConversations() {
    return this.supportService.getFlaggedConversations();
  }

  @Get('pending-verifications')
  @ApiOperation({ summary: 'Get pending KYC verifications' })
  async getPendingVerifications() {
    return this.supportService.getPendingVerifications();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent audit activity' })
  async getRecentActivity(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.supportService.getRecentActivity(limit);
  }

  @Get('ai-analytics')
  @ApiOperation({ summary: 'Get AI chatbot analytics' })
  async getAiAnalytics() {
    return this.supportService.getAiAnalytics();
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Get all global support contacts (Admin)' })
  async getContacts() {
    return this.supportService.getGlobalContacts(false);
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Create global support contact' })
  async createContact(@Body() body: { country: string, countryFlag: string, type: string, value: string, isActive: boolean }) {
    return this.supportService.upsertGlobalContact(body);
  }

  @Patch('contacts/:id')
  @ApiOperation({ summary: 'Update global support contact' })
  async updateContact(@Param('id') id: string, @Body() body: { country: string, countryFlag: string, type: string, value: string, isActive: boolean }) {
    return this.supportService.upsertGlobalContact({ ...body, id });
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: 'Delete global support contact' })
  async deleteContact(@Param('id') id: string) {
    return this.supportService.deleteGlobalContact(id);
  }
}
