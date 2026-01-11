import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Post,
} from '@nestjs/common';
import { CommissionService } from './commission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, CommissionStatus } from '@prisma/client';

@Controller('admin/commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  /**
   * Get all commissions with optional filters
   * GET /api/admin/commissions?status=PENDING&shopId=xxx&page=1&limit=20
   */
  @Get()
  async getAllCommissions(
    @Query('status') status?: CommissionStatus,
    @Query('shopId') shopId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.commissionService.getAllCommissions({
      status,
      shopId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * Mark commission as paid
   * PATCH /api/admin/commissions/:id/mark-paid
   */
  @Patch(':id/mark-paid')
  async markCommissionPaid(
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.commissionService.markCommissionPaid(id, notes);
  }

  /**
   * Waive commission
   * PATCH /api/admin/commissions/:id/waive
   */
  @Patch(':id/waive')
  async waiveCommission(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.commissionService.waiveCommission(id, reason);
  }

  /**
   * Process overdue commissions (can be called manually or by cron)
   * POST /api/admin/commissions/process-overdue
   */
  @Post('process-overdue')
  async processOverdueCommissions() {
    return this.commissionService.processOverdueCommissions();
  }
}
