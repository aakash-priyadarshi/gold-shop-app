import { Controller, Get, Post, Delete, Patch, Param, Body, Res, NotFoundException, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { BackupService } from './backup.service';
import { Response } from 'express';
@ApiTags('backups')
@Controller('backups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  @ApiOperation({ summary: 'List all available database backups stored on server' })
  getBackups() {
    return this.backupService.getAvailableBackups();
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger a manual database dump instantly' })
  async triggerBackup() {
    try {
      await this.backupService.triggerManualBackup();
      return { success: true, message: 'Database backup initiated.' };
    } catch (e: any) {
      throw new InternalServerErrorException(e.message);
    }
  }

  @Post('pre-migrate')
  @ApiOperation({
    summary:
      'Create a mandatory pre-migration database backup (must succeed before prisma migrate deploy)',
  })
  async preMigrateBackup() {
    try {
      const result = await this.backupService.createPreMigrationBackup();
      return {
        success: true,
        message: 'Pre-migration backup created. Safe to run migrate deploy.',
        filename: result.filename,
      };
    } catch (e: any) {
      throw new InternalServerErrorException(e.message);
    }
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Delete a specific backup file' })
  deleteBackup(@Param('filename') filename: string) {
    if (!filename.endsWith('.sql') || filename.includes('..') || filename.includes('/')) {
      throw new NotFoundException('Invalid backup filename.');
    }
    return this.backupService.deleteBackup(filename);
  }

  @Get('download/:filename')
  @ApiOperation({ summary: 'Download a specific backup file as an SQL attachment' })
  async downloadBackup(@Param('filename') filename: string, @Res() res: Response) {
    if (!filename.endsWith('.sql') || filename.includes('..') || filename.includes('/')) {
      throw new NotFoundException('Invalid backup filename.');
    }
    
    try {
      const signedUrl = await this.backupService.getDownloadUrl(filename);
      // Redirect the user to the presigned URL
      res.redirect(signedUrl);
    } catch (e) {
      throw new NotFoundException('Requested backup file not found. It may have expired.');
    }
  }

  // --- Schedule Management ---
  @Get('schedules')
  @ApiOperation({ summary: 'List backup schedules' })
  getSchedules() {
    return this.backupService.getSchedules();
  }

  @Post('schedules')
  @ApiOperation({ summary: 'Create a backup schedule' })
  createSchedule(@Body() body: { name: string, cronExp: string }) {
    return this.backupService.createSchedule(body);
  }

  @Patch('schedules/:id/toggle')
  @ApiOperation({ summary: 'Toggle a backup schedule active state' })
  toggleSchedule(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.backupService.toggleSchedule(id, body.isActive);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: 'Delete a backup schedule' })
  deleteSchedule(@Param('id') id: string) {
    return this.backupService.deleteSchedule(id);
  }
}
