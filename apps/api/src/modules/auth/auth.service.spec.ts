import { HttpException, HttpStatus } from '@nestjs/common';
import { OtpType, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';

describe('password-reset verification', () => {
  it('returns the verified-login context needed to request an email OTP', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'seller@example.com',
          passwordHash: await bcrypt.hash('Password1!', 4),
          emailVerified: false,
          role: UserRole.SHOPKEEPER,
          status: UserStatus.PENDING_VERIFICATION,
          shops: [],
        }),
      },
    };
    const service = new AuthService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.login({ email: 'seller@example.com', password: 'Password1!' } as any),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'EMAIL_NOT_VERIFIED',
        email: 'seller@example.com',
        userId: 'user-1',
      }),
    });
  });

  it('marks the email verified after a valid password-reset code', async () => {
    const prisma = {
      user: { update: jest.fn().mockResolvedValue({}) },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      session: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const otpService = {
      verifyOtpByEmail: jest.fn().mockResolvedValue({
        success: true,
        userId: 'user-1',
      }),
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new AuthService(
      prisma as any,
      {} as any,
      auditService as any,
      {} as any,
      otpService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.resetPassword('seller@example.com', '123456', 'NewPassword1!');

    expect(otpService.verifyOtpByEmail).toHaveBeenCalledWith(
      'seller@example.com',
      'PASSWORD_RESET',
      '123456',
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        passwordHash: expect.any(String),
        emailVerified: true,
        emailVerifiedAt: expect.any(Date),
      }),
    });
  });

  it('charges an existing password-reset request only once per rate-limit key', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          firstName: 'Seller',
        }),
      },
      otpVerification: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const mailService = {
      send: jest.fn().mockResolvedValue({ success: true }),
    };
    const service = new OtpService(
      prisma as any,
      mailService as any,
      {} as any,
      { isAvailable: jest.fn().mockReturnValue(false) } as any,
    );
    const checkRateLimit = jest
      .spyOn(service as any, 'checkRateLimit')
      .mockResolvedValue(undefined);

    await service.sendPasswordResetOtp(
      'Seller@Example.com',
      '203.0.113.10',
    );

    expect(checkRateLimit).toHaveBeenCalledTimes(2);
    expect(checkRateLimit).toHaveBeenNthCalledWith(
      1,
      'otp:email:seller@example.com',
      5,
    );
    expect(checkRateLimit).toHaveBeenNthCalledWith(
      2,
      'otp:ip:203.0.113.10',
      10,
    );
    expect(prisma.otpVerification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'PASSWORD_RESET' as OtpType,
          target: 'seller@example.com',
        }),
      }),
    );
  });

  it('returns the generic response when a known email is over the rate limit', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          firstName: 'Seller',
        }),
      },
    };
    const service = new OtpService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
    );
    jest.spyOn(service, 'sendOtp').mockRejectedValue(
      new HttpException('Too many OTP requests', HttpStatus.TOO_MANY_REQUESTS),
    );

    await expect(
      service.sendPasswordResetOtp('seller@example.com', '203.0.113.10'),
    ).resolves.toEqual({
      success: true,
      message: 'If an account exists with this email, a reset code has been sent.',
    });
  });

  it('returns the same generic response when an unknown email is over the rate limit', async () => {
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new OtpService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
    );
    jest.spyOn(service as any, 'checkRateLimit').mockRejectedValue(
      new HttpException('Too many OTP requests', HttpStatus.TOO_MANY_REQUESTS),
    );

    await expect(
      service.sendPasswordResetOtp('unknown@example.com', '203.0.113.10'),
    ).resolves.toEqual({
      success: true,
      message: 'If an account exists with this email, a reset code has been sent.',
    });
  });
});
