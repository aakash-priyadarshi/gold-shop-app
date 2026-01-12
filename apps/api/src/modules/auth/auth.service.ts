import { 
  Injectable, 
  UnauthorizedException, 
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, UserStatus, CurrencyCode } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  shopId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    shopId?: string;
    shopName?: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private mailService: MailService,
  ) {}

  /**
   * Register a new user (CUSTOMER or SHOPKEEPER)
   * SHOPKEEPER registration requires shop details
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check phone if provided
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already registered');
      }
    }

    // Validate shopkeeper registration has shop details
    if (dto.role === 'SHOPKEEPER' && !dto.shop) {
      throw new BadRequestException('Shop details are required for shopkeeper registration');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Determine preferred currency based on shop country or default
    let preferredCurrency: CurrencyCode = CurrencyCode.NPR;
    if (dto.shop?.currency) {
      preferredCurrency = dto.shop.currency as CurrencyCode;
    }

    // Use transaction for user + shop creation
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role as UserRole,
          status: dto.role === 'SHOPKEEPER' ? UserStatus.PENDING_VERIFICATION : UserStatus.ACTIVE,
          preferredLanguage: dto.preferredLanguage || 'en',
          preferredCurrency,
        },
      });

      let shop = null;
      
      // Create shop for shopkeeper
      if (dto.role === 'SHOPKEEPER' && dto.shop) {
        shop = await tx.shop.create({
          data: {
            userId: user.id,
            shopName: dto.shop.shopName,
            country: dto.shop.country,
            city: dto.shop.city,
            address: dto.shop.address,
            contactPhone: dto.shop.contactPhone,
            contactEmail: dto.shop.contactEmail,
            isVerified: false, // Requires admin approval
            isActive: true,
          },
        });
      }

      return { user, shop };
    });

    // Log audit
    await this.auditService.log({
      userId: result.user.id,
      actorType: 'USER',
      action: 'REGISTER',
      resourceType: 'USER',
      resourceId: result.user.id,
      newValue: { 
        email: result.user.email, 
        role: result.user.role,
        shopId: result.shop?.id,
      },
    });

    this.logger.log(`New ${dto.role} registered: ${dto.email}`);

    // Send welcome email (non-blocking)
    this.mailService.sendWelcome(result.user.email, result.user.firstName)
      .catch(err => this.logger.error(`Failed to send welcome email: ${err.message}`));

    // Generate tokens
    return this.generateTokens(result.user, result.shop);
  }

  /**
   * Login with email and password
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { shop: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended. Please contact support.');
    }

    if (user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedException('Account deactivated');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log audit
    await this.auditService.log({
      userId: user.id,
      actorType: 'USER',
      action: 'LOGIN',
      resourceType: 'USER',
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    return this.generateTokens(user, user.shop, ipAddress, userAgent);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // Try new RefreshToken table first, fall back to Session
    const tokenHash = this.hashToken(refreshToken);
    
    // Check RefreshToken table
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { shop: true } } },
    });

    if (storedToken) {
      // Check if token is valid
      if (storedToken.revokedAt) {
        this.logger.warn(`Refresh token reuse detected for user ${storedToken.userId}`);
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      const user = storedToken.user;
      if (!user || user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
        throw new UnauthorizedException('User account is not active');
      }

      // Revoke old token (rotation)
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      return this.generateTokens(user, user.shop, ipAddress, userAgent);
    }

    // Fall back to legacy Session table
    const session = await this.prisma.session.findUnique({
      where: { token: refreshToken },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: { shop: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Delete old session
    await this.prisma.session.delete({
      where: { id: session.id },
    });

    return this.generateTokens(user, user.shop, ipAddress, userAgent);
  }

  /**
   * Get current user profile with shop details
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { 
        shop: {
          select: {
            id: true,
            shopName: true,
            country: true,
            city: true,
            isVerified: true,
            isActive: true,
            makingChargePercent: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      preferredLanguage: user.preferredLanguage,
      preferredCurrency: user.preferredCurrency,
      themeMode: user.themeMode,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      shop: user.shop,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async getUserFromToken(token: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { shop: true },
      });
    } catch {
      return null;
    }
  }

  private async generateTokens(
    user: { id: string; email: string; firstName: string; lastName: string; role: UserRole },
    shop?: { id: string; shopName: string } | null,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      shopId: shop?.id,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);

    // Store in RefreshToken table
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + this.refreshTokenExpiry),
      },
    });

    // Also store in legacy Session table for backward compatibility
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + this.refreshTokenExpiry),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        shopId: shop?.id,
        shopName: shop?.shopName,
      },
    };
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async logout(userId: string, token?: string) {
    if (token) {
      const tokenHash = this.hashToken(token);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { revokedAt: new Date() },
      });
      
      await this.prisma.session.deleteMany({
        where: { userId, token },
      });
    }

    await this.auditService.log({
      userId,
      actorType: 'USER',
      action: 'LOGOUT',
      resourceType: 'USER',
      resourceId: userId,
    });
  }
}
