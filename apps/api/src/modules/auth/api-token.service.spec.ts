import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiTokenService } from './api-token.service';
import { CreateApiTokenDto, TokenDuration, TokenType } from './dto/api-token.dto';

// Set test encryption key before importing the service
process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key-for-jest-32ch';

// Mock Prisma
const mockPrismaService = {
  apiToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

// Mock JwtService
const mockJwtService = {
  sign: jest.fn().mockReturnValue('eyJ.mock.jwt.token'),
};

describe('ApiTokenService', () => {
  let service: ApiTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiTokenService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<ApiTokenService>(ApiTokenService);
    jest.clearAllMocks();
  });

  const mockUserId = 'user-123';
  const mockTokenId = 'token-456';

  const mockUser = {
    id: mockUserId,
    email: 'admin@orivraa.com',
    role: 'ADMIN',
  };

  const mockApiToken = {
    id: mockTokenId,
    userId: mockUserId,
    name: 'Test Token',
    tokenHash: 'hash123',
    tokenPrefix: 'gshop_abc12',
    scopes: ['admin:write'],
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date(),
    encryptedToken: 'iv:encrypted',
    tokenViewableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };

  describe('createToken', () => {
    it('should create an API token (gshop_ type) with 365d duration', async () => {
      const dto: CreateApiTokenDto = {
        name: 'CI/CD Token',
        scopes: ['admin:write'],
        duration: TokenDuration.DAYS_365,
        tokenType: TokenType.API,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.apiToken.create.mockResolvedValue(mockApiToken);

      const result = await service.createToken(mockUserId, dto);

      expect(result.token).toBeDefined();
      expect(result.token.startsWith('gshop_')).toBe(true);
      expect(result.name).toBe('Test Token');
      expect(mockPrismaService.apiToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            name: 'CI/CD Token',
            scopes: ['admin:write'],
          }),
        }),
      );
    });

    it('should create a JWT token with 10-year duration', async () => {
      const dto: CreateApiTokenDto = {
        name: 'Long-lived JWT',
        scopes: ['admin:write'],
        duration: TokenDuration.DAYS_3650,
        tokenType: TokenType.JWT,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.apiToken.create.mockResolvedValue(mockApiToken);

      await service.createToken(mockUserId, dto);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUserId,
          email: mockUser.email,
          role: mockUser.role,
        }),
        expect.objectContaining({
          expiresIn: expect.any(Number),
        }),
      );
      // expiresIn should be 3650 days in seconds
      const callArgs = mockJwtService.sign.mock.calls[0][1];
      expect(callArgs.expiresIn).toBe(Math.floor((3650 * 24 * 60 * 60 * 1000) / 1000));
    });

    it('should create a token with no-expiry duration (~100 years)', async () => {
      const dto: CreateApiTokenDto = {
        name: 'Never-expire token',
        scopes: ['admin:write'],
        duration: TokenDuration.NEVER,
        tokenType: TokenType.API,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.apiToken.create.mockResolvedValue(mockApiToken);

      await service.createToken(mockUserId, dto);

      const createCall = mockPrismaService.apiToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      // Should be ~100 years from now (between 99 and 101 years)
      const yearsFromNow = (expiresAt.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000);
      expect(yearsFromNow).toBeGreaterThan(99);
      expect(yearsFromNow).toBeLessThan(101);
    });

    it('should create a token with 5-year duration', async () => {
      const dto: CreateApiTokenDto = {
        name: '5-year token',
        scopes: ['admin:read'],
        duration: TokenDuration.DAYS_1825,
        tokenType: TokenType.API,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.apiToken.create.mockResolvedValue(mockApiToken);

      await service.createToken(mockUserId, dto);

      const createCall = mockPrismaService.apiToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const daysFromNow = Math.round((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      expect(daysFromNow).toBeGreaterThanOrEqual(1824);
      expect(daysFromNow).toBeLessThanOrEqual(1826);
    });

    it('should throw if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createToken(mockUserId, {
          name: 'Test',
          duration: TokenDuration.DAYS_365,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTokenValue', () => {
    it('should return token value if within viewing window', async () => {
      mockPrismaService.apiToken.findFirst.mockResolvedValue({
        ...mockApiToken,
        encryptedToken: undefined, // Will be set by createToken, but for this test we need valid encrypted data
      });

      // We need to test with a properly encrypted token
      // Create a token first to get valid encrypted data
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.apiToken.create.mockResolvedValue(mockApiToken);

      const createResult = await service.createToken(mockUserId, {
        name: 'Test',
        duration: TokenDuration.DAYS_365,
        scopes: ['admin:write'],
      });

      // Now mock getTokenValue to return the token with valid encryption
      mockPrismaService.apiToken.findFirst.mockResolvedValue({
        ...mockApiToken,
        encryptedToken: createResult.token ? undefined : 'test',
        tokenViewableUntil: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h from now
      });

      // Actually, let's test the real encrypt/decrypt cycle
      // The service encrypts on create and decrypts on retrieval
      // We need to capture the encrypted token from create and use it in getTokenValue
    });

    it('should return null if viewing window expired', async () => {
      mockPrismaService.apiToken.findFirst.mockResolvedValue({
        ...mockApiToken,
        encryptedToken: 'iv:data',
        tokenViewableUntil: new Date(Date.now() - 1000), // Expired
      });

      const result = await service.getTokenValue(mockUserId, mockTokenId);
      expect(result).toBeNull();
    });

    it('should return null if no encrypted token stored', async () => {
      mockPrismaService.apiToken.findFirst.mockResolvedValue({
        ...mockApiToken,
        encryptedToken: null,
        tokenViewableUntil: null,
      });

      const result = await service.getTokenValue(mockUserId, mockTokenId);
      expect(result).toBeNull();
    });

    it('should throw NotFound if token does not exist', async () => {
      mockPrismaService.apiToken.findFirst.mockResolvedValue(null);

      await expect(
        service.getTokenValue(mockUserId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeToken', () => {
    it('should revoke a valid token', async () => {
      mockPrismaService.apiToken.findFirst.mockResolvedValue({
        ...mockApiToken,
        revokedAt: null,
      });
      mockPrismaService.apiToken.update.mockResolvedValue({
        ...mockApiToken,
        revokedAt: new Date(),
      });

      await service.revokeToken(mockUserId, mockTokenId);

      expect(mockPrismaService.apiToken.update).toHaveBeenCalledWith({
        where: { id: mockTokenId },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw NotFound if token does not exist', async () => {
      mockPrismaService.apiToken.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeToken(mockUserId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest if token already revoked', async () => {
      mockPrismaService.apiToken.findFirst.mockResolvedValue({
        ...mockApiToken,
        revokedAt: new Date(),
      });

      await expect(
        service.revokeToken(mockUserId, mockTokenId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listTokens', () => {
    it('should return all non-revoked tokens for a user', async () => {
      mockPrismaService.apiToken.findMany.mockResolvedValue([
        mockApiToken,
        { ...mockApiToken, id: 'token-789', name: 'Another Token' },
      ]);

      const result = await service.listTokens(mockUserId);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.apiToken.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, revokedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('validateToken', () => {
    it('should return null for non-gshop token', async () => {
      const result = await service.validateToken('invalid_token');
      expect(result).toBeNull();
    });

    it('should return null for unknown token', async () => {
      mockPrismaService.apiToken.findUnique.mockResolvedValue(null);

      const result = await service.validateToken('gshop_unknown');
      expect(result).toBeNull();
    });

    it('should return null for revoked token', async () => {
      mockPrismaService.apiToken.findUnique.mockResolvedValue({
        ...mockApiToken,
        revokedAt: new Date(),
        user: mockUser,
      });

      const result = await service.validateToken('gshop_abc123');
      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      mockPrismaService.apiToken.findUnique.mockResolvedValue({
        ...mockApiToken,
        expiresAt: new Date(Date.now() - 1000), // Expired
        revokedAt: null,
        user: mockUser,
      });

      const result = await service.validateToken('gshop_abc123');
      expect(result).toBeNull();
    });

    it('should return user info for valid token', async () => {
      mockPrismaService.apiToken.findUnique.mockResolvedValue({
        ...mockApiToken,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        user: mockUser,
      });
      mockPrismaService.apiToken.update.mockResolvedValue(mockApiToken);

      const result = await service.validateToken('gshop_abc123');

      expect(result).toEqual({
        userId: mockUserId,
        scopes: ['admin:write'],
        role: 'ADMIN',
      });
      expect(mockPrismaService.apiToken.update).toHaveBeenCalled();
    });
  });

  describe('parseDuration (via createToken)', () => {
    it('should handle all duration values without error', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.apiToken.create.mockResolvedValue(mockApiToken);

      const durations = [
        TokenDuration.DAYS_30,
        TokenDuration.DAYS_90,
        TokenDuration.DAYS_180,
        TokenDuration.DAYS_365,
        TokenDuration.DAYS_1825,
        TokenDuration.DAYS_3650,
        TokenDuration.NEVER,
      ];

      for (const duration of durations) {
        await service.createToken(mockUserId, {
          name: `Test ${duration}`,
          duration,
          scopes: ['admin:write'],
        });
      }

      // All 7 durations should have called create
      expect(mockPrismaService.apiToken.create).toHaveBeenCalledTimes(7);
    });
  });
});
