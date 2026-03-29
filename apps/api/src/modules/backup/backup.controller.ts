import { Controller, Get, Post, Param, Res, NotFoundException, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { BackupService } from './backup.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('backups')
@Controller('backups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  @ApiOperation({ summary: 'List all available database backups stored on server (Admin only)' })
  getBackups() {
    return this.backupService.getAvailableBackups();
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger a manual database dump instantly (Admin only)' })
  async triggerBackup() {
    try {
      await this.backupService.triggerManualBackup();
      return { success: true, message: 'Database backup initiated and email notification dispatched.' };
    } catch (e: any) {
      throw new InternalServerErrorException(e.message);
    }
  }

  @Get('download/:filename')
  @ApiOperation({ summary: 'Download a specific backup file as an SQL attachment (Admin only)' })
  downloadBackup(@Param('filename') filename: string, @Res() res: Response) {
    if (!filename.endsWith('.sql') || filename.includes('..') || filename.includes('/')) {
      throw new NotFoundException('Invalid backup filename.');
    }
    const filePath = path.join(process.cwd(), 'backups', filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Requested backup file not found. It may have expired.');
    }
    
    // Serve the .sql file as a direct download attachment
    res.download(filePath);
  }
}
