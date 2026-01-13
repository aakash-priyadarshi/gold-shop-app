import { Injectable, BadRequestException, NotFoundException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';

// Rate limiting configuration
interface RateLimitConfig {
  maxPerEmail: number;
  maxPerIp: number;
  windowMs: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly rateLimitConfig: RateLimitConfig = {
    maxPerEmail: 5,   // Max 5 OTP requests per email per hour
    maxPerIp: 10,     // Max 10 OTP requests per IP per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  };

  // In-memory rate limit store (use Redis in production for distributed systems)
  private rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  private generateOtp(length = 6): string {
    // Use cryptographically secure random generation
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);
    const otp = (randomNumber % 900000 + 100000).toString();
    return otp.substring(0, length);
  }

  /**
   * Check rate limit for email or IP
   */
  private checkRateLimit(key: string, max: number): void {
    const now = Date.now();
    const record = this.rateLimitStore.get(key);

    if (record) {
      if (now > record.resetAt) {
        // Window expired, reset
        this.rateLimitStore.set(key, { count: 1, resetAt: now + this.rateLimitConfig.windowMs });
      } else if (record.count >= max) {
        const minutesLeft = Math.ceil((record.resetAt - now) / 60000);
        throw new HttpException(
          `Too many OTP requests. Please try again in ${minutesLeft} minutes.`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      } else {
        record.count++;
      }
    } else {
      this.rateLimitStore.set(key, { count: 1, resetAt: now + this.rateLimitConfig.windowMs });
    }
  }

  async sendOtp(
    userId: string, 
    type: OtpType, 
    target: string,
    ipAddress?: string,
    userName?: string,
  ): Promise<{ message: string; expiresAt: Date }> {
    // Normalize target (email to lowercase)
    const normalizedTarget = type === 'EMAIL_VERIFICATION' || type === 'PASSWORD_RESET'
      ? target.toLowerCase().trim()
      : target.trim();

    // Rate limit checks
    this.checkRateLimit(`otp:email:${normalizedTarget}`, this.rateLimitConfig.maxPerEmail);
    if (ipAddress) {
      this.checkRateLimit(`otp:ip:${ipAddress}`, this.rateLimitConfig.maxPerIp);
    }

    // Mark any existing OTPs as expired (don't delete - keep for audit)
    // This allows old codes to still fail gracefully instead of "not found"
    await this.prisma.otpVerification.updateMany({
      where: { userId, type, verifiedAt: null },
      data: { expiresAt: new Date() }, // Expire them immediately
    });

    // Generate new OTP
    const otp = this.generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.otpVerification.create({
      data: {
        userId,
        type,
        target: normalizedTarget,
        code: hashedOtp,
        expiresAt,
      },
    });

    this.logger.debug(`OTP created for user ${userId}, type: ${type}, target: ${this.maskTarget(normalizedTarget, type)}`);

    // Send OTP based on type using Resend
    if (type === 'EMAIL_VERIFICATION' || type === 'PASSWORD_RESET') {
      await this.sendEmailOtp(target, otp, type, userName);
    } else if (type === 'PHONE_VERIFICATION' || type === 'LOGIN_2FA') {
      await this.sendSmsOtp(target, otp, type);
    }

    this.logger.log(`OTP sent for ${type} to ${this.maskTarget(target, type)}`);

    return {
      message: `OTP sent to ${this.maskTarget(target, type)}`,
      expiresAt,
    };
  }

  /**
   * Send OTP for email verification (no userId required initially)
   */
  async sendVerificationOtpByEmail(
    email: string,
    userId: string,
    userName: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string; expiresAt?: Date }> {
    try {
      const result = await this.sendOtp(userId, 'EMAIL_VERIFICATION' as OtpType, email, ipAddress, userName);
      return { success: true, message: result.message, expiresAt: result.expiresAt };
    } catch (error: any) {
      this.logger.error(`Failed to send verification OTP: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send password reset OTP (by email, even if user doesn't exist respond 200 for privacy)
   */
  async sendPasswordResetOtp(
    email: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string }> {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Rate limit first
    this.checkRateLimit(`otp:email:${normalizedEmail}`, this.rateLimitConfig.maxPerEmail);
    if (ipAddress) {
      this.checkRateLimit(`otp:ip:${ipAddress}`, this.rateLimitConfig.maxPerIp);
    }

    // Look for user with case-insensitive email match
    const user = await this.prisma.user.findFirst({
      where: { 
        email: { equals: normalizedEmail, mode: 'insensitive' }
      },
    });

    // For privacy, always return success
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return { success: true, message: 'If an account exists with this email, a reset code has been sent.' };
    }

    try {
      await this.sendOtp(user.id, 'PASSWORD_RESET' as OtpType, normalizedEmail, ipAddress, user.firstName);
      this.logger.log(`Password reset OTP sent for user ${user.id}`);
      return { success: true, message: 'If an account exists with this email, a reset code has been sent.' };
    } catch (error: any) {
      // For privacy, don't reveal errors
      this.logger.error(`Failed to send password reset OTP: ${error.message}`);
      return { success: true, message: 'If an account exists with this email, a reset code has been sent.' };
    }
  }

  async verifyOtp(userId: string, type: OtpType, code: string): Promise<{ success: boolean; message: string }> {
    // Trim the code to handle copy-paste whitespace issues
    const trimmedCode = code.trim();
    
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
      // Check if there's an expired OTP to provide better message
      const expiredOtp = await this.prisma.otpVerification.findFirst({
        where: { userId, type, verifiedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      
      if (expiredOtp) {
        this.logger.debug(`OTP expired for user ${userId}, type: ${type}`);
        throw new BadRequestException('Your code has expired. Please request a new one.');
      }
      
      // Check if OTP was already verified
      const verifiedOtp = await this.prisma.otpVerification.findFirst({
        where: { userId, type, verifiedAt: { not: null } },
        orderBy: { createdAt: 'desc' },
      });
      
      if (verifiedOtp) {
        this.logger.debug(`OTP already used for user ${userId}, type: ${type}`);
        throw new BadRequestException('This code has already been used. Please request a new one if needed.');
      }
      
      this.logger.warn(`No OTP found for user ${userId}, type: ${type}`);
      throw new NotFoundException('No valid code found. Please request a new one.');
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      this.logger.warn(`Max OTP attempts exceeded for user ${userId}, type: ${type}`);
      throw new BadRequestException('Maximum attempts exceeded. Please request a new code.');
    }

    const isValid = await bcrypt.compare(trimmedCode, otpRecord.code);

    if (!isValid) {
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const remainingAttempts = otpRecord.maxAttempts - otpRecord.attempts - 1;
      this.logger.debug(`Invalid OTP attempt for user ${userId}, remaining: ${remainingAttempts}`);
      throw new BadRequestException(`Invalid code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`);
    }

    // Mark as verified
    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verifiedAt: new Date() },
    });

    // Update user verification status for phone verification only
    // Email verification status is updated by auth.service.verifyEmail()
    if (type === 'PHONE_VERIFICATION') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          phone: otpRecord.target,
          phoneVerifiedAt: new Date(),
        },
      });
    }

    this.logger.log(`OTP verified for user ${userId}, type: ${type}`);
    return { success: true, message: 'Verification successful' };
  }

  /**
   * Verify OTP by email (for password reset where we may not have userId in request)
   */
  async verifyOtpByEmail(
    email: string, 
    type: OtpType, 
    code: string
  ): Promise<{ success: boolean; userId?: string; message: string }> {
    // Normalize email for lookup
    const normalizedEmail = email.toLowerCase().trim();
    
    // Case-insensitive email lookup
    const user = await this.prisma.user.findFirst({
      where: { 
        email: { equals: normalizedEmail, mode: 'insensitive' }
      },
    });

    if (!user) {
      this.logger.warn(`OTP verification attempted for non-existent email: ${normalizedEmail}`);
      throw new BadRequestException('Invalid email or code.');
    }

    const result = await this.verifyOtp(user.id, type, code);
    return { ...result, userId: user.id };
  }

  async resendOtp(userId: string, type: OtpType, ipAddress?: string): Promise<{ message: string; expiresAt: Date }> {
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

    return this.sendOtp(userId, type, target, ipAddress, user.firstName);
  }

  private async sendEmailOtp(email: string, otp: string, type: OtpType, userName?: string): Promise<void> {
    const name = userName || 'User';
    
    if (type === 'EMAIL_VERIFICATION') {
      const result = await this.mailService.sendOtp(email, otp, name);
      if (!result.success) {
        this.logger.error(`Failed to send verification OTP email: ${result.error}`);
        throw new BadRequestException('Failed to send verification email. Please try again.');
      }
    } else if (type === 'PASSWORD_RESET') {
      // Send password reset email with OTP
      const result = await this.mailService.send({
        to: email,
        subject: 'Reset Your Orivraa Password',
        template: 'password-reset-otp',
        context: { 
          name,
          otp, 
          expiresIn: '10 minutes',
        },
      });
      if (!result.success) {
        this.logger.error(`Failed to send password reset OTP email: ${result.error}`);
        throw new BadRequestException('Failed to send password reset email. Please try again.');
      }
    }
  }

  private async sendSmsOtp(phone: string, otp: string, type: OtpType): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, local SMS gateway)
    this.logger.log(`[SMS OTP] Would send ${type} OTP ${otp} to ${phone}`);
    
    // For development, log the OTP
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`📱 DEV SMS OTP: ${otp} for ${phone}`);
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
