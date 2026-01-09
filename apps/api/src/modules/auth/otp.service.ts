import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private generateOtp(length = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  async sendOtp(userId: string, type: OtpType, target: string): Promise<{ message: string; expiresAt: Date }> {
    // Invalidate any existing OTP for this user/type
    await this.prisma.otpVerification.deleteMany({
      where: { userId, type, verifiedAt: null },
    });

    // Generate new OTP
    const otp = this.generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.otpVerification.create({
      data: {
        userId,
        type,
        target,
        code: hashedOtp,
        expiresAt,
      },
    });

    // Send OTP based on type
    if (type === 'EMAIL_VERIFICATION' || type === 'PASSWORD_RESET') {
      await this.sendEmailOtp(target, otp, type);
    } else if (type === 'PHONE_VERIFICATION' || type === 'LOGIN_2FA') {
      await this.sendSmsOtp(target, otp, type);
    }

    return {
      message: `OTP sent to ${this.maskTarget(target, type)}`,
      expiresAt,
    };
  }

  async verifyOtp(userId: string, type: OtpType, code: string): Promise<{ success: boolean; message: string }> {
    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        userId,
        type,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new NotFoundException('No valid OTP found. Please request a new one.');
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      throw new BadRequestException('Maximum attempts exceeded. Please request a new OTP.');
    }

    const isValid = await bcrypt.compare(code, otpRecord.code);

    if (!isValid) {
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException(`Invalid OTP. ${otpRecord.maxAttempts - otpRecord.attempts - 1} attempts remaining.`);
    }

    // Mark as verified
    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verifiedAt: new Date() },
    });

    // Update user verification status
    if (type === 'EMAIL_VERIFICATION') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date() },
      });
    } else if (type === 'PHONE_VERIFICATION') {
      // Also update phone number if it was provided during OTP send
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          phone: otpRecord.target,
          phoneVerifiedAt: new Date(),
        },
      });
    }

    return { success: true, message: 'Verification successful' };
  }

  async resendOtp(userId: string, type: OtpType): Promise<{ message: string; expiresAt: Date }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const target = type === 'EMAIL_VERIFICATION' || type === 'PASSWORD_RESET' 
      ? user.email 
      : user.phone;

    if (!target) {
      throw new BadRequestException(`No ${type === 'EMAIL_VERIFICATION' ? 'email' : 'phone'} registered`);
    }

    return this.sendOtp(userId, type, target);
  }

  private async sendEmailOtp(email: string, otp: string, type: OtpType): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`[EMAIL OTP] Sending ${type} OTP ${otp} to ${email}`);
    
    // For development, log the OTP
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 DEV EMAIL OTP: ${otp} for ${email}`);
    }
  }

  private async sendSmsOtp(phone: string, otp: string, type: OtpType): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, local SMS gateway)
    console.log(`[SMS OTP] Sending ${type} OTP ${otp} to ${phone}`);
    
    // For development, log the OTP
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📱 DEV SMS OTP: ${otp} for ${phone}`);
    }
  }

  private maskTarget(target: string, type: OtpType): string {
    if (type === 'EMAIL_VERIFICATION' || type === 'PASSWORD_RESET') {
      const [name, domain] = target.split('@');
      return `${name.substring(0, 2)}***@${domain}`;
    }
    // Phone
    return `***${target.slice(-4)}`;
  }
}
