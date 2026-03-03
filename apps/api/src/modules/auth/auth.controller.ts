import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { SkipSecurity } from "../security/security.guard";
import { AuthResponse, AuthService, RegisterResponse } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { TurnstileService } from "./turnstile.service";

@ApiTags("auth")
@Controller("auth")
@SkipSecurity() // Auth endpoints must remain accessible even when an IP is temporarily blocked
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private turnstileService: TurnstileService,
  ) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new user (CUSTOMER or SHOPKEEPER)" })
  @ApiResponse({
    status: 201,
    description: "User registered. Verification OTP sent to email.",
  })
  @ApiResponse({ status: 409, description: "Email already registered" })
  @ApiResponse({
    status: 400,
    description: "Shop details required for shopkeeper or CAPTCHA failed",
  })
  async register(
    @Body() dto: RegisterDto,
    @Request() req: any,
  ): Promise<RegisterResponse> {
    const ipAddress = req.ip || req.connection?.remoteAddress;

    // Verify Turnstile CAPTCHA
    await this.turnstileService.verify(dto.turnstileToken, ipAddress);

    return this.authService.register(dto, ipAddress);
  }

  @Get("check-email")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: "Check if email is already registered (uses Redis cache)",
  })
  @ApiQuery({
    name: "email",
    required: true,
    description: "Email address to check",
  })
  @ApiQuery({
    name: "excludeUserId",
    required: false,
    description: "User ID to exclude from check (for edit scenarios)",
  })
  @ApiResponse({ status: 200, description: "Returns whether email exists" })
  async checkEmail(
    @Query("email") email: string,
    @Query("excludeUserId") excludeUserId?: string,
  ) {
    if (!email) {
      return { exists: false, message: "Email is required" };
    }
    const result = await this.authService.checkEmailExists(
      email.toLowerCase().trim(),
    );
    // If excludeUserId is provided, check if the found user is the same
    // This allows editing your own email without triggering "already exists"
    if (excludeUserId && result.exists && result.userId === excludeUserId) {
      return { exists: false };
    }
    return { exists: result.exists };
  }

  @Get("check-phone")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: "Check if phone number is already registered (uses Redis cache)",
  })
  @ApiQuery({
    name: "phone",
    required: true,
    description: "Phone number to check",
  })
  @ApiQuery({
    name: "excludeUserId",
    required: false,
    description: "User ID to exclude from check (for edit scenarios)",
  })
  @ApiResponse({ status: 200, description: "Returns whether phone exists" })
  async checkPhone(
    @Query("phone") phone: string,
    @Query("excludeUserId") excludeUserId?: string,
  ) {
    if (!phone) {
      return { exists: false, message: "Phone is required" };
    }
    const result = await this.authService.checkPhoneExists(phone.trim());
    // If excludeUserId is provided, check if the found user is the same
    // This allows editing your own phone without triggering "already exists"
    if (excludeUserId && result.exists && result.userId === excludeUserId) {
      return { exists: false };
    }
    return { exists: result.exists };
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify email with OTP sent during registration" })
  @ApiResponse({
    status: 200,
    description: "Email verified. Returns auth tokens.",
  })
  @ApiResponse({ status: 400, description: "Invalid or expired OTP" })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<AuthResponse> {
    return this.authService.verifyEmail(dto.userId, dto.code);
  }

  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend email verification OTP" })
  @ApiResponse({
    status: 200,
    description: "Verification OTP sent if email exists",
  })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Request() req: any,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.authService.resendVerificationOtp(dto.email, ipAddress);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @ApiResponse({ status: 403, description: "Email not verified" })
  @ApiResponse({ status: 400, description: "CAPTCHA verification failed" })
  async login(
    @Body() dto: LoginDto,
    @Request() req: any,
  ): Promise<AuthResponse> {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers["user-agent"];

    // Verify Turnstile CAPTCHA
    await this.turnstileService.verify(dto.turnstileToken, ipAddress);

    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password reset OTP" })
  @ApiResponse({
    status: 200,
    description: "Password reset OTP sent if email exists",
  })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.authService.forgotPassword(dto.email, ipAddress);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with OTP" })
  @ApiResponse({ status: 200, description: "Password reset successful" })
  @ApiResponse({ status: 400, description: "Invalid or expired OTP" })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  @ApiResponse({ status: 200, description: "Token refreshed successfully" })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Request() req: any,
  ): Promise<AuthResponse> {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers["user-agent"];
    return this.authService.refreshToken(
      dto.refreshToken,
      ipAddress,
      userAgent,
    );
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout and invalidate refresh token" })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  async logout(
    @CurrentUser() user: any,
    @Body() body: { refreshToken?: string },
  ) {
    await this.authService.logout(user.id, body.refreshToken);
    return { message: "Logged out successfully" };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile with shop details" })
  @ApiResponse({ status: 200, description: "User profile returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async me(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }

  // =====================
  // Google OAuth Routes
  // =====================

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: "Initiate Google OAuth login" })
  @ApiExcludeEndpoint() // Hide from Swagger as it's a redirect
  async googleAuth() {
    // Guard redirects to Google
    // Role is passed as query param: /auth/google?role=SHOPKEEPER
  }

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint() // Hide from Swagger as it's a redirect
  async googleAuthCallback(@Request() req: any, @Res() res: Response) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";

    try {
      const requestedRole = req.user?.requestedRole || "CUSTOMER";
      const mode = req.user?.mode || "login";
      const desktopPort = req.user?.desktopPort;
      const result = await this.authService.googleAuth(
        req.user,
        ipAddress,
        userAgent,
      );

      // Check if this is a new SHOPKEEPER registration that needs shop details
      if (requestedRole === "SHOPKEEPER" && result.needsShopSetup) {
        // Redirect to shop setup page with tokens
        const params = new URLSearchParams({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn.toString(),
          setupRequired: "shop",
        });
        if (desktopPort) params.set("desktop_port", desktopPort);
        res.redirect(`${frontendUrl}/auth/oauth-callback?${params.toString()}`);
      } else {
        // Normal flow - redirect with tokens
        const params = new URLSearchParams({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn.toString(),
        });
        if (desktopPort) params.set("desktop_port", desktopPort);
        res.redirect(`${frontendUrl}/auth/oauth-callback?${params.toString()}`);
      }
    } catch (error) {
      // Handle account not found error for login mode
      if (error?.response?.code === "ACCOUNT_NOT_FOUND") {
        const params = new URLSearchParams({
          error: "account_not_found",
          email: error?.response?.email || "",
          message: "No account found with this email. Please register first.",
        });
        res.redirect(`${frontendUrl}/auth/login?${params.toString()}`);
      } else {
        res.redirect(
          `${frontendUrl}/auth/login?error=${encodeURIComponent(error.message)}`,
        );
      }
    }
  }
}
