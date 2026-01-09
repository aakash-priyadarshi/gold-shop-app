import { Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApiTokenDto, TokenDuration, ApiTokenResponseDto, CreateApiTokenResponseDto } from './dto/api-token.dto';
import * as crypto from 'crypto';

// Available scopes for API tokens
export const API_TOKEN_SCOPES = {
  'health:read': 'Read health check endpoints',
  'market-rates:read': 'Read market rates',
  'market-rates:refresh': 'Refresh market rate cache',
  'admin:read': 'Read admin endpoints',
  'admin:write': 'Write to admin endpoints',
} as const;

export type ApiTokenScope = keyof typeof API_TOKEN_SCOPES;

// Encryption key from environment or generate one
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').substring(0, 32);

@Injectable()
export class ApiTokenService {
  private readonly logger = new Logger(ApiTokenService.name);
  private readonly TOKEN_PREFIX = 'gshop_';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a cryptographically secure token
   */
  private generateToken(): string {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${this.TOKEN_PREFIX}${randomBytes}`;
  }

  /**
   * Hash a token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Encrypt token for temporary storage (viewable for 24h)
   */
  private encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)), iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt token from storage
   */
  private decryptToken(encryptedData: string): string {
    try {
      const [ivHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt token', error);
      throw new BadRequestException('Token cannot be decrypted');
    }
  }

  /**
   * Parse duration string to milliseconds
   */
  private parseDuration(duration: TokenDuration): number {
    const daysMap: Record<TokenDuration, number> = {
      [TokenDuration.DAYS_30]: 30,
      [TokenDuration.DAYS_90]: 90,
      [TokenDuration.DAYS_180]: 180,
      [TokenDuration.DAYS_365]: 365,
    };
    return daysMap[duration] * 24 * 60 * 60 * 1000;
  }

  /**
   * Create a new API token for a user
   */
  async createToken(
    userId: string,
    dto: CreateApiTokenDto,
  ): Promise<CreateApiTokenResponseDto> {
    // Validate scopes
    const validScopes = dto.scopes?.filter(s => s in API_TOKEN_SCOPES) || ['health:read'];
    
    // Generate token
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const tokenPrefix = token.substring(0, 12); // gshop_ + first 6 chars
    
    // Calculate expiry
    const expiresAt = new Date(Date.now() + this.parseDuration(dto.duration));
    
    // Encrypt token for 24h viewing window
    const encryptedToken = this.encryptToken(token);
    const tokenViewableUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create in database
    const apiToken = await this.prisma.apiToken.create({
      data: {
        userId,
        name: dto.name,
        tokenHash,
        tokenPrefix,
        scopes: validScopes,
        expiresAt,
        encryptedToken,
        tokenViewableUntil,
      },
    });

    this.logger.log(`Created API token "${dto.name}" for user ${userId}, expires ${expiresAt.toISOString()}`);

    return {
      id: apiToken.id,
      name: apiToken.name,
      tokenPrefix: apiToken.tokenPrefix,
      scopes: apiToken.scopes,
      expiresAt: apiToken.expiresAt,
      lastUsedAt: apiToken.lastUsedAt,
      createdAt: apiToken.createdAt,
      isExpired: false,
      daysUntilExpiry: Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      tokenViewableUntil,
      token, // Only returned at creation time!
    };
  }

  /**
   * Get token value if still within viewable window (24h)
   */
  async getTokenValue(userId: string, tokenId: string): Promise<{ token: string; viewableUntil: Date } | null> {
    const apiToken = await this.prisma.apiToken.findFirst({
      where: { 
        id: tokenId, 
        userId,
        revokedAt: null,
      },
    });

    if (!apiToken) {
      throw new NotFoundException('Token not found');
    }

    // Check if within viewing window
    if (!apiToken.encryptedToken || !apiToken.tokenViewableUntil) {
      return null; // Token was created before this feature
    }

    if (new Date() > apiToken.tokenViewableUntil) {
      return null; // Viewing window expired
    }

    const token = this.decryptToken(apiToken.encryptedToken);
    return {
      token,
      viewableUntil: apiToken.tokenViewableUntil,
    };
  }

  /**
   * List all tokens for a user
   */
  async listTokens(userId: string): Promise<ApiTokenResponseDto[]> {
    const tokens = await this.prisma.apiToken.findMany({
      where: { 
        userId,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return tokens.map(t => this.toResponseDto(t));
  }

  /**
   * Revoke a token
   */
  async revokeToken(userId: string, tokenId: string): Promise<void> {
    const token = await this.prisma.apiToken.findFirst({
      where: { id: tokenId, userId },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    if (token.revokedAt) {
      throw new BadRequestException('Token already revoked');
    }

    await this.prisma.apiToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Revoked API token ${tokenId} for user ${userId}`);
  }

  /**
   * Validate an API token and return user info
   */
  async validateToken(token: string): Promise<{ userId: string; scopes: string[]; role: string } | null> {
    if (!token.startsWith(this.TOKEN_PREFIX)) {
      return null;
    }

    const tokenHash = this.hashToken(token);

    const apiToken = await this.prisma.apiToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!apiToken) {
      return null;
    }

    // Check if revoked
    if (apiToken.revokedAt) {
      this.logger.warn(`Attempted use of revoked token ${apiToken.tokenPrefix}`);
      return null;
    }

    // Check if expired
    if (apiToken.expiresAt < new Date()) {
      this.logger.warn(`Attempted use of expired token ${apiToken.tokenPrefix}`);
      return null;
    }

    // Update last used timestamp
    await this.prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      userId: apiToken.userId,
      scopes: apiToken.scopes,
      role: apiToken.user.role,
    };
  }

  /**
   * Get tokens that will expire soon (for admin notifications)
   */
  async getExpiringTokens(userId: string, withinDays: number = 7): Promise<ApiTokenResponseDto[]> {
    const expiryThreshold = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);

    const tokens = await this.prisma.apiToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          lte: expiryThreshold,
          gte: new Date(),
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    return tokens.map(t => this.toResponseDto(t));
  }

  /**
   * Get token statistics for admin dashboard
   */
  async getTokenStats(userId: string): Promise<{
    total: number;
    active: number;
    expiringSoon: number;
    recentlyUsed: number;
  }> {
    const now = new Date();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, active, expiringSoon, recentlyUsed] = await Promise.all([
      this.prisma.apiToken.count({ where: { userId } }),
      this.prisma.apiToken.count({ 
        where: { userId, revokedAt: null, expiresAt: { gte: now } } 
      }),
      this.prisma.apiToken.count({
        where: { 
          userId, 
          revokedAt: null, 
          expiresAt: { gte: now, lte: sevenDaysFromNow } 
        },
      }),
      this.prisma.apiToken.count({
        where: { userId, lastUsedAt: { gte: oneDayAgo } },
      }),
    ]);

    return { total, active, expiringSoon, recentlyUsed };
  }

  private toResponseDto(token: {
    id: string;
    name: string;
    tokenPrefix: string;
    scopes: string[];
    expiresAt: Date;
    lastUsedAt: Date | null;
    createdAt: Date;
    tokenViewableUntil?: Date | null;
  }): ApiTokenResponseDto {
    const now = new Date();
    const isExpired = token.expiresAt < now;
    const daysUntilExpiry = Math.ceil(
      (token.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    return {
      id: token.id,
      name: token.name,
      tokenPrefix: token.tokenPrefix,
      scopes: token.scopes,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
      isExpired,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      tokenViewableUntil: token.tokenViewableUntil || null,
    };
  }
}
