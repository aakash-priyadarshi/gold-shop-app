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
import { SellerSubscriptionsService } from "../subscriptions/seller-subscriptions.service";
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
  isSuspended?: boolean; // True when account is suspended
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
    private sellerSubscriptionsService: SellerSubscriptionsService,
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

    // Auto-activate FREE subscription plan for new shopkeeper shops
    if (result.shop) {
      await this.sellerSubscriptionsService.autoActivateFreePlan(
        result.shop.id,
        dto.shop?.country || "NP",
      );
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

  // ═══════════════════════════════════════════════════════════
  //  CONVERT TO SHOPKEEPER
  // ═══════════════════════════════════════════════════════════
  async convertToShopkeeper(userId: string, shopDto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { shops: true },
    });

    if (!user) throw new NotFoundException("User not found");
    // Ensure only unverified users or CUSTOMERS can convert, just to be safe.
    if (user.role === "SHOPKEEPER") {
      throw new BadRequestException("Account is already a shopkeeper");
    }
    if (user.shops && user.shops.length > 0) {
      throw new BadRequestException("User already has a shop");
    }

    const preferredCurrency = (shopDto.currency as CurrencyCode) || user.preferredCurrency;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          role: "SHOPKEEPER",
          preferredCurrency,
        },
      });

      const shop = await tx.shop.create({
        data: {
          userId,
          shopName: shopDto.shopName,
          country: shopDto.country,
          city: shopDto.city,
          address: shopDto.address,
          contactPhone: shopDto.contactPhone,
          contactEmail: shopDto.contactEmail,
          isVerified: false,
          isActive: true,
        },
      });

      return { user: updatedUser, shop };
    });

    // Auto-activate FREE subscription plan for the new shop
    await this.sellerSubscriptionsService.autoActivateFreePlan(
      result.shop.id,
      shopDto.country || "NP",
    );

    // Audit log
    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "CONVERT_ACCOUNT_TO_SHOPKEEPER",
      resourceType: "USER",
      resourceId: userId,
      newValue: { role: "SHOPKEEPER", shopId: result.shop.id },
    });

    // Send welcome email
    this.mailService
      .sendShopkeeperWelcome(result.user.email, result.user.firstName)
      .catch((err: any) =>
        this.logger.error(`Failed to send seller welcome email: ${err.message}`),
      );

    // Generate fresh tokens
    return this.generateTokens(result.user, result.shop);
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
    if (user.role === "SHOPKEEPER") {
      this.mailService
        .sendShopkeeperWelcome(user.email, user.firstName)
        .catch((err: any) =>
          this.logger.error(`Failed to send seller welcome email: ${err.message}`),
        );
    } else {
      this.mailService
        .sendWelcome(user.email, user.firstName)
        .catch((err) =>
          this.logger.error(`Failed to send customer welcome email: ${err.message}`),
        );
    }

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
        message:
          "Email not verified. Please check your inbox for the verification link.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    // Check if user is active
    // Suspended users are allowed to login but with restricted access
    // (frontend shows lock screen instead of full dashboard)
    const isSuspended = user.status === UserStatus.SUSPENDED;

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
      action: isSuspended ? "LOGIN_SUSPENDED" : "LOGIN",
      resourceType: "USER",
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    const tokens = await this.generateTokens(
      user,
      user.shops?.[0] || null,
      ipAddress,
      userAgent,
      dto.rememberMe,
    );

    return { ...tokens, isSuspended };
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
      mode?: string;
      // Google People API enriched fields
      googleBirthday?: string;
      googleGender?: string;
      googlePhoneRaw?: string;
      googleAddressRaw?: Record<string, unknown>;
      googleLocale?: string;
      googlePicture?: string;
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
            emailVerified: true,
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
            status:
              user.status === UserStatus.PENDING_VERIFICATION
                ? UserStatus.ACTIVE
                : user.status,
          },
        });
      }
      // Always update enriched Google data on login
      const enriched: Record<string, unknown> = {};
      if (googleUser.googleBirthday) enriched.googleBirthday = googleUser.googleBirthday;
      if (googleUser.googleGender) enriched.googleGender = googleUser.googleGender;
      if (googleUser.googlePhoneRaw) enriched.googlePhoneRaw = googleUser.googlePhoneRaw;
      if (googleUser.googleAddressRaw) enriched.googleAddressRaw = googleUser.googleAddressRaw;
      if (googleUser.googleLocale) enriched.googleLocale = googleUser.googleLocale;
      if (googleUser.googlePicture) enriched.googlePicture = googleUser.googlePicture;
      if (Object.keys(enriched).length) {
        await this.prisma.user.update({ where: { id: user.id }, data: enriched });
      }

      // Block only deactivated — suspended users are allowed to log in
      // (they see the locked dashboard overlay and can contact support)
      if (user.status === UserStatus.DEACTIVATED) {
        throw new UnauthorizedException("Account deactivated");
      }

      const isSuspended = user.status === UserStatus.SUSPENDED;

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Log audit
      await this.auditService.log({
        userId: user.id,
        actorType: "USER",
        action: isSuspended ? "LOGIN_SUSPENDED" : "LOGIN",
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

      return { ...tokens, isSuspended };
    }

    // User doesn't exist
    // User doesn't exist yet but tried to log in using Google Auth
    // Instead of throwing an error, we seamlessly auto-register them using the role requested.
    this.logger.log(
      `Auto-registering new Google account via OAuth: ${googleUser.email} (Role: ${requestedRole})`,
    );

    // Mode is 'register' - create new user from Google account
    const newUser = await this.prisma.user.create({
      data: {
        email: googleUser.email,
        googleId: googleUser.googleId,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        passwordHash: "", // No password for OAuth users
        role: requestedRole,
        status:
          requestedRole === UserRole.SHOPKEEPER
            ? UserStatus.PENDING_VERIFICATION
            : UserStatus.ACTIVE,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        preferredLanguage: "en",
        preferredCurrency: CurrencyCode.NPR,
        // Store enriched Google People API data on signup
        ...(googleUser.googleBirthday && { googleBirthday: googleUser.googleBirthday }),
        ...(googleUser.googleGender && { googleGender: googleUser.googleGender }),
        ...(googleUser.googlePhoneRaw && { googlePhoneRaw: googleUser.googlePhoneRaw }),
        ...(googleUser.googleAddressRaw && { googleAddressRaw: googleUser.googleAddressRaw as any }),
        ...(googleUser.googleLocale && { googleLocale: googleUser.googleLocale }),
        ...(googleUser.googlePicture && { googlePicture: googleUser.googlePicture }),
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
      if (newUser.role === "SHOPKEEPER") {
        this.mailService
          .sendShopkeeperWelcome(newUser.email, newUser.firstName)
          .catch((err: any) =>
            this.logger.error(`Failed to send seller welcome email: ${err.message}`),
          );
      } else {
        this.mailService
          .sendWelcome(newUser.email, newUser.firstName)
          .catch((err) =>
            this.logger.error(`Failed to send welcome email: ${err.message}`),
          );
      }

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
      // Only block deactivated users from refreshing — suspended users
      // must stay logged in so they can see the lock overlay and contact support
      if (!user || user.status === UserStatus.DEACTIVATED) {
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
            isOnHold: true,
            holdReason: true,
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

  // ─── PIN Fast Login ───────────────────────────────────────────

  /** Setup or update the 6-digit PIN for fast re-login after timeout */
  async setupPin(userId: string, pin: string): Promise<{ message: string }> {
    if (!/^\d{6}$/.test(pin)) {
      throw new BadRequestException("PIN must be exactly 6 digits");
    }
    const pinHash = await bcrypt.hash(pin, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash, pinSetAt: new Date(), pinFailedCount: 0, pinLockedUntil: null },
    });
    this.logger.log(`PIN set for user ${userId}`);
    return { message: "PIN set successfully" };
  }

  /** Verify PIN and issue new tokens — called from lock screen after 30-min inactivity */
  async loginWithPin(
    userId: string,
    pin: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { shops: true },
    });

    if (!user || !user.pinHash) {
      throw new UnauthorizedException("PIN not set for this account");
    }

    // Check lockout
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const remainingMs = user.pinLockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new UnauthorizedException(
        `PIN locked due to too many failed attempts. Try again in ${remainingMin} minute(s).`,
      );
    }

    const isValid = await bcrypt.compare(pin, user.pinHash);

    if (!isValid) {
      const failedCount = (user.pinFailedCount || 0) + 1;
      const updateData: Record<string, unknown> = { pinFailedCount: failedCount };

      if (failedCount >= 5) {
        // Lock for 15 minutes
        updateData.pinLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        updateData.pinFailedCount = 0;
      }

      await this.prisma.user.update({ where: { id: userId }, data: updateData });
      throw new UnauthorizedException(
        failedCount >= 5
          ? "Too many failed attempts. PIN locked for 15 minutes."
          : `Invalid PIN. ${5 - failedCount} attempt(s) remaining.`,
      );
    }

    // PIN correct — reset counter and issue tokens
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinFailedCount: 0, pinLockedUntil: null, lastLoginAt: new Date() },
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "LOGIN",
      resourceType: "USER",
      resourceId: userId,
      metadata: { method: "pin" },
      ipAddress,
      userAgent,
    });

    return this.generateTokens(user, user.shops?.[0] || null, ipAddress, userAgent);
  }

  /** Remove PIN from account */
  async removePin(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash: null, pinSetAt: null, pinFailedCount: 0, pinLockedUntil: null },
    });
    return { message: "PIN removed successfully" };
  }

  /** Get PIN status for current user */
  async getPinStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pinHash: true, pinSetAt: true, pinLockedUntil: true },
    });
    return {
      hasPin: !!user?.pinHash,
      pinSetAt: user?.pinSetAt || null,
      pinLockedUntil: user?.pinLockedUntil || null,
    };
  }
}
