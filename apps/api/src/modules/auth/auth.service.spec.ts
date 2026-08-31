import { HttpException, HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { CurrencyCode, OtpType, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateShopDto } from './dto/register.dto';
import { OtpService } from './otp.service';

describe('password-reset verification', () => {
  const genericVerificationResponse = {
    success: true,
    message:
      'If the email exists and requires verification, a verification code has been sent.',
  };

  function createResendVerificationService(
    user: {
      id: string;
      email: string;
      firstName: string;
      emailVerified: boolean;
    } | null,
    crashReports?: { submit: jest.Mock },
  ) {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
    };
    const otpService = {
      sendVerificationOtpByEmail: jest
        .fn()
        .mockResolvedValue({ success: true }),
    };
    const service = new AuthService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      otpService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      crashReports as any,
    );
    return { service, otpService };
  }

  describe('resend verification privacy', () => {
    it('returns the generic response for an unknown email', async () => {
      const { service, otpService } = createResendVerificationService(null);

      await expect(
        service.resendVerificationOtp('unknown@example.com', '203.0.113.10'),
      ).resolves.toEqual(genericVerificationResponse);
      expect(otpService.sendVerificationOtpByEmail).not.toHaveBeenCalled();
    });

    it('returns the same generic response for an already-verified email', async () => {
      const { service, otpService } = createResendVerificationService({
        id: 'user-1',
        email: 'verified@example.com',
        firstName: 'Verified',
        emailVerified: true,
      });

      await expect(
        service.resendVerificationOtp('verified@example.com', '203.0.113.10'),
      ).resolves.toEqual(genericVerificationResponse);
      expect(otpService.sendVerificationOtpByEmail).not.toHaveBeenCalled();
    });

    it('sends an OTP for an existing unverified email and returns the generic response', async () => {
      const { service, otpService } = createResendVerificationService({
        id: 'user-1',
        email: 'unverified@example.com',
        firstName: 'Unverified',
        emailVerified: false,
      });

      await expect(
        service.resendVerificationOtp('unverified@example.com', '203.0.113.10'),
      ).resolves.toEqual(genericVerificationResponse);
      expect(otpService.sendVerificationOtpByEmail).toHaveBeenCalledWith(
        'unverified@example.com',
        'user-1',
        'Unverified',
        '203.0.113.10',
      );
    });

    it('returns the generic response when an existing unverified email is rate limited', async () => {
      const crashReports = { submit: jest.fn() };
      const { service, otpService } = createResendVerificationService(
        {
          id: 'user-1',
          email: 'unverified@example.com',
          firstName: 'Unverified',
          emailVerified: false,
        },
        crashReports,
      );
      otpService.sendVerificationOtpByEmail.mockRejectedValue(
        new HttpException(
          'Too many OTP requests',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

      await expect(
        service.resendVerificationOtp('unverified@example.com', '203.0.113.10'),
      ).resolves.toEqual(genericVerificationResponse);
      expect(otpService.sendVerificationOtpByEmail).toHaveBeenCalledTimes(1);
      expect(crashReports.submit).not.toHaveBeenCalled();
    });

    it('records delivery failures without changing the public response', async () => {
      const crashReports = {
        submit: jest.fn().mockResolvedValue({ id: 'crash-1' }),
      };
      const { service, otpService } = createResendVerificationService(
        {
          id: 'user-1',
          email: 'unverified@example.com',
          firstName: 'Unverified',
          emailVerified: false,
        },
        crashReports,
      );
      otpService.sendVerificationOtpByEmail.mockRejectedValue(
        new Error('Provider unavailable'),
      );

      await expect(
        service.resendVerificationOtp('unverified@example.com'),
      ).resolves.toEqual(genericVerificationResponse);
      await Promise.resolve();

      expect(crashReports.submit).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'Email verification OTP delivery failed',
          page: '/auth/login',
          userId: 'user-1',
          userAgent: 'server:auth-service',
        }),
      );
    });

    it('does not disclose verification state or OTP rate limiting in a successful 200 public response', async () => {
      const unknown = createResendVerificationService(null).service;
      const verified = createResendVerificationService({
        id: 'user-1',
        email: 'verified@example.com',
        firstName: 'Verified',
        emailVerified: true,
      }).service;
      const unverified = createResendVerificationService({
        id: 'user-2',
        email: 'unverified@example.com',
        firstName: 'Unverified',
        emailVerified: false,
      }).service;
      const rateLimited = createResendVerificationService({
        id: 'user-3',
        email: 'rate-limited@example.com',
        firstName: 'Rate Limited',
        emailVerified: false,
      });
      rateLimited.otpService.sendVerificationOtpByEmail.mockRejectedValue(
        new HttpException(
          'Too many OTP requests',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

      await expect(
        Promise.all([
          unknown.resendVerificationOtp('unknown@example.com'),
          verified.resendVerificationOtp('verified@example.com'),
          unverified.resendVerificationOtp('unverified@example.com'),
          rateLimited.service.resendVerificationOtp('rate-limited@example.com'),
        ]),
      ).resolves.toEqual([
        genericVerificationResponse,
        genericVerificationResponse,
        genericVerificationResponse,
        genericVerificationResponse,
      ]);
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          AuthController.prototype.resendVerification,
        ),
      ).toBe(HttpStatus.OK);
    });
  });

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
      service.login({
        email: 'seller@example.com',
        password: 'Password1!',
      } as any),
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

    await service.resetPassword(
      'seller@example.com',
      '123456',
      'NewPassword1!',
    );

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

    await service.sendPasswordResetOtp('Seller@Example.com', '203.0.113.10');

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
    jest
      .spyOn(service, 'sendOtp')
      .mockRejectedValue(
        new HttpException(
          'Too many OTP requests',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

    await expect(
      service.sendPasswordResetOtp('seller@example.com', '203.0.113.10'),
    ).resolves.toEqual({
      success: true,
      message:
        'If an account exists with this email, a reset code has been sent.',
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
    jest
      .spyOn(service as any, 'checkRateLimit')
      .mockRejectedValue(
        new HttpException(
          'Too many OTP requests',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

    await expect(
      service.sendPasswordResetOtp('unknown@example.com', '203.0.113.10'),
    ).resolves.toEqual({
      success: true,
      message:
        'If an account exists with this email, a reset code has been sent.',
    });
  });
});

describe('shopkeeper registration address', () => {
  it('accepts an omitted address and stores a safe empty value', async () => {
    const shopDto = plainToInstance(CreateShopDto, {
      shopName: 'Address Optional Jewellers',
      country: 'IN',
      currency: CurrencyCode.INR,
      city: 'Patna',
      contactPhone: '+919876543210',
    });
    await expect(validate(shopDto)).resolves.toHaveLength(0);

    const tx = {
      user: {
        create: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'seller@example.com',
          firstName: 'Seller',
          role: UserRole.SHOPKEEPER,
        }),
      },
      shop: { create: jest.fn().mockResolvedValue({ id: 'shop-1' }) },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const redis = {
      getCachedEmailExists: jest.fn().mockResolvedValue(null),
      cacheEmailExists: jest.fn().mockResolvedValue(undefined),
      invalidateEmailCache: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(
      prisma as any,
      {} as any,
      { log: jest.fn().mockResolvedValue(undefined) } as any,
      {} as any,
      {
        sendVerificationOtpByEmail: jest.fn().mockResolvedValue(undefined),
      } as any,
      redis as any,
      { autoActivateFreePlan: jest.fn().mockResolvedValue(undefined) } as any,
      { processReferralSignup: jest.fn().mockResolvedValue(undefined) } as any,
      {} as any,
    );

    await service.register({
      email: 'seller@example.com',
      password: 'Password1!',
      firstName: 'Seller',
      lastName: 'Account',
      role: UserRole.SHOPKEEPER,
      shop: {
        shopName: 'Address Optional Jewellers',
        country: 'IN',
        currency: CurrencyCode.INR,
        city: 'Patna',
        contactPhone: '+919876543210',
      },
    });

    expect(tx.shop.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ address: '' }),
    });
  });
});
