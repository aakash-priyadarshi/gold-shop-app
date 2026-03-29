import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DesktopSessionService } from './desktop-session.service';

@ApiTags('sessions')
@Controller('sessions/desktop')
export class DesktopSessionController {
  constructor(private readonly desktopSessionService: DesktopSessionService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a desktop app session (called by Tauri on launch)' })
  async start(
    @Body()
    body: {
      userId?: string;
      appVersion: string;
      os: string;
      arch?: string;
    },
    @Request() req: any,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress || '0.0.0.0';
    return this.desktopSessionService.startSession({
      userId: body.userId,
      ipAddress,
      appVersion: body.appVersion,
      os: body.os,
      arch: body.arch,
    });
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 55000, limit: 2 } })
  @ApiOperation({ summary: 'Desktop session heartbeat (every 60s from Tauri)' })
  async heartbeat(@Body() body: { sessionToken: string }) {
    await this.desktopSessionService.heartbeat(body.sessionToken);
  }

  @Post('end')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End a desktop session (app quit or crash)' })
  async end(@Body() body: { sessionToken: string; closedBy?: string }) {
    await this.desktopSessionService.endSession(
      body.sessionToken,
      body.closedBy || 'user_quit',
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Desktop usage statistics' })
  async getAdminStats(
    @Query('period') period: 'daily' | 'monthly' | 'yearly' = 'daily',
  ) {
    return this.desktopSessionService.getAdminStats(period);
  }
}
