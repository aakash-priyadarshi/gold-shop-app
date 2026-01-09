import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { OtpType } from '@prisma/client';
import { IsEnum, IsString, Length, IsOptional } from 'class-validator';

class SendOtpDto {
  @IsEnum(['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET'])
  type: OtpType;

  @IsOptional()
  @IsString()
  target?: string;
}

class VerifyOtpDto {
  @IsEnum(['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET'])
  type: OtpType;

  @IsString()
  @Length(6, 6)
  code: string;
}

@ApiTags('otp')
@Controller('otp')
export class OtpController {
  constructor(private otpService: OtpService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send OTP for verification' })
  @HttpCode(HttpStatus.OK)
  async sendOtp(
    @CurrentUser('id') userId: string,
    @CurrentUser() user: any,
    @Body() dto: SendOtpDto,
  ) {
    // If target is provided, use it; otherwise use user's email/phone
    if (dto.target) {
      return this.otpService.sendOtp(userId, dto.type, dto.target);
    }
    return this.otpService.resendOtp(userId, dto.type);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify OTP code' })
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyOtpDto,
  ) {
    return this.otpService.verifyOtp(userId, dto.type, dto.code);
  }

  @Post('resend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend OTP' })
  @HttpCode(HttpStatus.OK)
  async resendOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: SendOtpDto,
  ) {
    return this.otpService.resendOtp(userId, dto.type);
  }
}
