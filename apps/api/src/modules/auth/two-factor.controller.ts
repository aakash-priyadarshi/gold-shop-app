import { Controller, Post, Get, Body, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

class VerifyTokenDto {
  token: string;
}

class DisableTwoFactorDto {
  password: string;
  token?: string;
}

@ApiTags('Two-Factor Authentication')
@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get 2FA status for current user' })
  async getStatus(@CurrentUser('id') userId: string) {
    return this.twoFactorService.getStatus(userId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  async generateSecret(@CurrentUser('id') userId: string) {
    return this.twoFactorService.generateSecret(userId);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify 2FA token and enable 2FA' })
  @ApiBody({ type: VerifyTokenDto })
  async verifyAndEnable(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyTokenDto,
  ) {
    return this.twoFactorService.verifyAndEnable(userId, dto.token);
  }

  @Delete('disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBody({ type: DisableTwoFactorDto })
  async disable(
    @CurrentUser('id') userId: string,
    @Body() dto: DisableTwoFactorDto,
  ) {
    return this.twoFactorService.disable(userId, dto.password, dto.token);
  }

  @Post('backup-codes/regenerate')
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiBody({ type: VerifyTokenDto })
  async regenerateBackupCodes(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyTokenDto,
  ) {
    return this.twoFactorService.regenerateBackupCodes(userId, dto.token);
  }
}
