import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OtpType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OtpService } from './otp.service';

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

  private assertPhoneVerificationAllowed(user: any): void {
    if (user?.role !== 'CUSTOMER' && user?.role !== 'SHOPKEEPER') {
      throw new ForbiddenException('Phone verification is only available for customer and shopkeeper accounts.');
    }
  }

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
    if (dto.type === 'PHONE_VERIFICATION') {
      this.assertPhoneVerificationAllowed(user);
    }

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
    @CurrentUser() user: any,
    @Body() dto: VerifyOtpDto,
  ) {
    if (dto.type === 'PHONE_VERIFICATION') {
      this.assertPhoneVerificationAllowed(user);
    }

    return this.otpService.verifyOtp(userId, dto.type, dto.code);
  }

  @Post('resend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend OTP' })
  @HttpCode(HttpStatus.OK)
  async resendOtp(
    @CurrentUser('id') userId: string,
    @CurrentUser() user: any,
    @Body() dto: SendOtpDto,
  ) {
    if (dto.type === 'PHONE_VERIFICATION') {
      this.assertPhoneVerificationAllowed(user);
    }

    return this.otpService.resendOtp(userId, dto.type);
  }
}
