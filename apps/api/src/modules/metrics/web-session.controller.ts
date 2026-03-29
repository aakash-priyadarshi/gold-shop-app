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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WebSessionService } from './web-session.service';

@ApiTags('sessions')
@Controller('sessions/web')
export class WebSessionController {
  constructor(private readonly webSessionService: WebSessionService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a new web session' })
  async start(
    @Body() body: { sessionToken: string; referrer?: string },
    @Request() req: any,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const user = req.user;

    return this.webSessionService.startSession({
      userId: user?.id,
      role: user?.role,
      sessionToken: body.sessionToken,
      ipAddress,
      userAgent,
      referrer: body.referrer,
    });
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 55000, limit: 2 } }) // max 2 per 55s per IP
  @ApiOperation({ summary: 'Session heartbeat — keep alive and count page view' })
  async heartbeat(@Body() body: { sessionToken: string }) {
    await this.webSessionService.heartbeat(body.sessionToken);
  }

  @Post('end')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End a web session' })
  async end(@Body() body: { sessionToken: string; closedBy?: string }) {
    await this.webSessionService.endSession(
      body.sessionToken,
      body.closedBy || 'beacon',
    );
  }

  /** Admin: aggregated stats */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Get web session statistics' })
  async getAdminStats(
    @Query('period') period: 'daily' | 'monthly' | 'yearly' = 'daily',
  ) {
    return this.webSessionService.getAdminStats(period);
  }

  /** Shopkeeper: their own stats shown at top of dashboard */
  @Get('my-stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my session stats (shopkeeper dashboard)' })
  async getMyStats(@CurrentUser() user: any) {
    return this.webSessionService.getMyStats(user.id);
  }
}
