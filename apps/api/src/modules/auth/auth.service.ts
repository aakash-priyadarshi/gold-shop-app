import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { CurrencyCode, UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { RedisService } from "../../common/redis";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MailService } from "../mail/mail.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { OtpService } from "./otp.service";

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
  needsShopSetup?: boolean; // For Google OAuth shopkeeper registration
  accountNotFound?: boolean; // For Google OAuth login when account doesn't exist
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

export interface RegisterResponse {
  success: boolean;
  message: string;
  userId: string;
  email: string;
  requiresVerification: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  private readonly refreshTokenExpiryRememberMe = 30 * 24 * 60 * 60 * 1000; // 30 days in ms when "remember me" is checked
  private readonly accessTokenExpiryRememberMe = "30d"; // 30 days for access token when "remember me" is checked

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private mailService: MailService,
    private otpService: OtpService,
    private redisService: RedisService,
  ) {}

  /**
   * Check if email exists (with Redis caching)
   */
  async checkEmailExists(
    email: string,
  ): Promise<{ exists: boolean; userId?: string }> {
    // Check Redis cache first
    const cached = await this.redisService.getCachedEmailExists(email);
    if (cached !== null) {
      this.logger.debug(
        `Email existence check from cache: ${email} -> ${cached.exists}`,
      );
      return cached;
    }

    // Query database
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const result = { exists: !!user, userId: user?.id };

    // Cache the result
    await this.redisService.cacheEmailExists(
      email,
      result.exists,
      result.userId,
    );

    return result;
  }

  /**
   * Check if phone exists (with Redis caching)
   */
  async checkPhoneExists(
    phone: string,
  ): Promise<{ exists: boolean; userId?: string }> {
    // Check Redis cache first
    const cached = await this.redisService.getCachedPhoneExists(phone);
    if (cached !== null) {
      this.logger.debug(
        `Phone existence check from cache: ${phone} -> ${cached.exists}`,
      );
      return cached;
    }

    // Query database
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    const result = { exists: !!user, userId: user?.id };

    // Cache the result
    await this.redisService.cachePhoneExists(
      phone,
      result.exists,
      result.userId,
    );

    return result;
  }

  /**
   * Register a new user (CUSTOMER or SHOPKEEPER)
   * SHOPKEEPER registration requires shop details
   * Returns registration info and sends verification OTP
   */
  async register(
    dto: RegisterDto,
    ipAddress?: string,
  ): Promise<RegisterResponse> {
    // Check if email already exists (using cached check)
    const emailCheck = await this.checkEmailExists(dto.email);
    if (emailCheck.exists) {
      throw new ConflictException("Email already registered");
    }

    // Check phone if provided (using cached check)
    if (dto.phone) {
      const phoneCheck = await this.checkPhoneExists(dto.phone);
      if (phoneCheck.exists) {
        throw new ConflictException("Phone number already registered");
      }
    }

    // Validate shopkeeper registration has shop details
    if (dto.role === "SHOPKEEPER" && !dto.shop) {
      throw new BadRequestException(
        "Shop details are required for shopkeeper registration",
      );
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
      // Create user with emailVerified = false (pending verification)
      const user = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role as UserRole,
          status: UserStatus.PENDING_VERIFICATION, // All users start pending until email verified
          emailVerified: false,
          preferredLanguage: dto.preferredLanguage || "en",
          preferredCurrency,
        },
      });

      let shop = null;

      // Create shop for shopkeeper
      if (dto.role === "SHOPKEEPER" && dto.shop) {
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
      actorType: "USER",
      action: "REGISTER",
      resourceType: "USER",
      resourceId: result.user.id,
      newValue: {
        email: result.user.email,
        role: result.user.role,
        shopId: result.shop?.id,
      },
    });

    // Invalidate cache after user creation
    await this.redisService.invalidateEmailCache(dto.email);
    if (dto.phone) {
      await this.redisService.invalidatePhoneCache(dto.phone);
    }

    this.logger.log(`New ${dto.role} registered: ${dto.email}`);

    // Send email verification OTP (non-blocking but log errors)
    try {
      await this.otpService.sendVerificationOtpByEmail(
        result.user.email,
        result.user.id,
        result.user.firstName,
        ipAddress,
      );
    } catch (error) {
      this.logger.error(`Failed to send verification OTP: ${error.message}`);
      // Don't throw - user is created, they can request resend
    }

    return {
      success: true,
      message:
        "Registration successful. Please verify your email with the OTP sent.",
      userId: result.user.id,
      email: result.user.email,
      requiresVerification: true,
    };
  }

  /**
   * Verify email with OTP after registration
   */
  async verifyEmail(userId: string, code: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { shops: true },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (user.emailVerified) {
      throw new BadRequestException("Email already verified");
    }

    // Verify the OTP
    await this.otpService.verifyOtp(userId, "EMAIL_VERIFICATION", code);

    // Update user status to active after email verification
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status:
          user.role === "SHOPKEEPER"
            ? UserStatus.PENDING_VERIFICATION
            : UserStatus.ACTIVE,
      },
    });

    this.logger.log(`Email verified for user: ${user.email}`);

    // Send welcome email
    this.mailService
      .sendWelcome(user.email, user.firstName)
      .catch((err) =>
        this.logger.error(`Failed to send welcome email: ${err.message}`),
      );

    // Generate tokens and log the user in
    // Get the active shop for the user (first shop or by activeShopId)
    const activeShop = user.shops?.[0] || null;
    return this.generateTokens(user, activeShop);
  }

  /**
   * Resend verification OTP
   */
  async resendVerificationOtp(
    email: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return {
        success: true,
        message: "If the email exists, a verification code has been sent.",
      };
    }

    if (user.emailVerified) {
      throw new BadRequestException("Email already verified");
    }

    await this.otpService.sendVerificationOtpByEmail(
      user.email,
      user.id,
      user.firstName,
      ipAddress,
    );
    return { success: true, message: "Verification code sent to your email." };
  }

  /**
   * Login with email and password
   */
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { shops: true },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new ForbiddenException({
        message: "Email not verified",
        code: "EMAIL_NOT_VERIFIED",
        userId: user.id,
        email: user.email,
      });
    }

    // Check if user is active
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        "Account suspended. Please contact support.",
      );
    }

    if (user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedException("Account deactivated");
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log audit
    await this.auditService.log({
      userId: user.id,
      actorType: "USER",
      action: "LOGIN",
      resourceType: "USER",
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    return this.generateTokens(
      user,
      user.shops?.[0] || null,
      ipAddress,
      userAgent,
      dto.rememberMe,
    );
  }

  /**
   * Request password reset OTP
   */
  async forgotPassword(
    email: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.otpService.sendPasswordResetOtp(email, ipAddress);
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    // Verify OTP
    const result = await this.otpService.verifyOtpByEmail(
      email,
      "PASSWORD_RESET",
      code,
    );

    if (!result.success || !result.userId) {
      throw new BadRequestException("Invalid or expired code");
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.prisma.user.update({
      where: { id: result.userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId: result.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.session.deleteMany({
      where: { userId: result.userId },
    });

    // Log audit
    await this.auditService.log({
      userId: result.userId,
      actorType: "USER",
      action: "PASSWORD_RESET",
      resourceType: "USER",
      resourceId: result.userId,
    });

    this.logger.log(`Password reset for user: ${email}`);

    return {
      success: true,
      message:
        "Password reset successful. Please login with your new password.",
    };
  }

  /**
   * Handle Google OAuth login/registration
   * Supports both CUSTOMER and SHOPKEEPER roles
   * For SHOPKEEPER: creates user first, then requires shop setup on frontend
   * For login mode: if account doesn't exist, returns accountNotFound flag
   */
  async googleAuth(
    googleUser: {
      googleId: string;
      email: string;
      firstName: string;
      lastName: string;
      picture?: string;
      requestedRole?: string;
      mode?: string; // 'login' or 'register'
    },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const requestedRole =
      googleUser.requestedRole === "SHOPKEEPER"
        ? UserRole.SHOPKEEPER
        : UserRole.CUSTOMER;
    const mode = googleUser.mode || "login"; // Default to login mode

    // Check if user exists by googleId or email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
      },
      include: { shops: true },
    });

    if (user) {
      // Existing user - link Google account if not already linked
      if (!user.googleId) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.googleId,
            emailVerified: true, // Google verified the email
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
            status:
              user.status === UserStatus.PENDING_VERIFICATION
                ? UserStatus.ACTIVE
                : user.status,
          },
        });
      }

      // Check if user is active
      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException(
          "Account suspended. Please contact support.",
        );
      }

      if (user.status === UserStatus.DEACTIVATED) {
        throw new UnauthorizedException("Account deactivated");
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Log audit
      await this.auditService.log({
        userId: user.id,
        actorType: "USER",
        action: "LOGIN",
        resourceType: "USER",
        resourceId: user.id,
        metadata: { method: "google" },
        ipAddress,
        userAgent,
      });

      const tokens = await this.generateTokens(
        user,
        user.shops?.[0] || null,
        ipAddress,
        userAgent,
      );

      // If user is SHOPKEEPER but has no shop, they need to complete setup
      if (user.role === UserRole.SHOPKEEPER && !user.shops?.length) {
        return { ...tokens, needsShopSetup: true };
      }

      return tokens;
    }

    // User doesn't exist
    // If mode is 'login', indicate account not found instead of creating
    if (mode === "login") {
      this.logger.log(
        `Google OAuth login attempted for non-existent account: ${googleUser.email}`,
      );
      throw new NotFoundException({
        message: "No account found with this email. Please register first.",
        code: "ACCOUNT_NOT_FOUND",
        email: googleUser.email,
      });
    }

    // Mode is 'register' - create new user from Google account
    const newUser = await this.prisma.user.create({
      data: {
        email: googleUser.email,
        googleId: googleUser.googleId,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        passwordHash: "", // No password for OAuth users
        role: requestedRole,
        // SHOPKEEPER accounts via OAuth start as PENDING_VERIFICATION until shop is created
        status:
          requestedRole === UserRole.SHOPKEEPER
            ? UserStatus.PENDING_VERIFICATION
            : UserStatus.ACTIVE,
        emailVerified: true, // Google verified the email
        emailVerifiedAt: new Date(),
        preferredLanguage: "en",
        preferredCurrency: CurrencyCode.NPR,
      },
    });

    // Invalidate email cache after user creation
    await this.redisService.invalidateEmailCache(googleUser.email);

    // Log audit
    await this.auditService.log({
      userId: newUser.id,
      actorType: "USER",
      action: "REGISTER",
      resourceType: "USER",
      resourceId: newUser.id,
      newValue: { email: newUser.email, method: "google", role: requestedRole },
    });

    this.logger.log(
      `New Google OAuth user registered: ${googleUser.email} as ${requestedRole}`,
    );

    // Send welcome email
    this.mailService
      .sendWelcome(newUser.email, newUser.firstName)
      .catch((err) =>
        this.logger.error(`Failed to send welcome email: ${err.message}`),
      );

    const tokens = await this.generateTokens(
      newUser,
      null,
      ipAddress,
      userAgent,
    );

    // If SHOPKEEPER, they need to complete shop setup
    if (requestedRole === UserRole.SHOPKEEPER) {
      return { ...tokens, needsShopSetup: true };
    }

    return tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    // Try new RefreshToken table first, fall back to Session
    const tokenHash = this.hashToken(refreshToken);

    // Check RefreshToken table
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { shops: true } } },
    });

    if (storedToken) {
      // Check if token is valid
      if (storedToken.revokedAt) {
        this.logger.warn(
          `Refresh token reuse detected for user ${storedToken.userId}`,
        );
        throw new UnauthorizedException("Refresh token has been revoked");
      }

      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException("Refresh token has expired");
      }

      const user = storedToken.user;
      if (
        !user ||
        user.status === UserStatus.SUSPENDED ||
        user.status === UserStatus.DEACTIVATED
      ) {
        throw new UnauthorizedException("User account is not active");
      }

      // Revoke old token (rotation)
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      return this.generateTokens(
        user,
        user.shops?.[0] || null,
        ipAddress,
        userAgent,
      );
    }

    // Fall back to legacy Session table
    const session = await this.prisma.session.findUnique({
      where: { token: refreshToken },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: { shops: true },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Delete old session
    await this.prisma.session.delete({
      where: { id: session.id },
    });

    return this.generateTokens(
      user,
      user.shops?.[0] || null,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Get current user profile with shop details
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        shops: {
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
      throw new UnauthorizedException("User not found");
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
      phoneVerifiedAt: user.phoneVerifiedAt,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      shop: user.shops?.[0] || null,
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
        include: { shops: true },
      });
    } catch {
      return null;
    }
  }

  private async generateTokens(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
    },
    shop?: { id: string; shopName: string } | null,
    ipAddress?: string,
    userAgent?: string,
    rememberMe?: boolean,
  ): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      shopId: shop?.id,
    };

    // Use extended expiry when "remember me" is checked
    const tokenExpiry = rememberMe
      ? this.refreshTokenExpiryRememberMe
      : this.refreshTokenExpiry;
    const accessTokenExpiry = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 24 hours in seconds

    // Sign with custom expiry if rememberMe is true
    const accessToken = rememberMe
      ? this.jwtService.sign(payload, {
          expiresIn: this.accessTokenExpiryRememberMe,
        })
      : this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);

    // Store in RefreshToken table
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + tokenExpiry),
      },
    });

    // Also store in legacy Session table for backward compatibility
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + tokenExpiry),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiry,
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
    return crypto.randomBytes(64).toString("hex");
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
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
      actorType: "USER",
      action: "LOGOUT",
      resourceType: "USER",
      resourceId: userId,
    });
  }
}
