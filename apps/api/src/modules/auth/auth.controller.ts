import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AuthService, AuthResponse, RegisterResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user (CUSTOMER or SHOPKEEPER)' })
  @ApiResponse({ status: 201, description: 'User registered. Verification OTP sent to email.' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Shop details required for shopkeeper' })
  async register(@Body() dto: RegisterDto, @Request() req: any): Promise<RegisterResponse> {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.authService.register(dto, ipAddress);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP sent during registration' })
  @ApiResponse({ status: 200, description: 'Email verified. Returns auth tokens.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<AuthResponse> {
    return this.authService.verifyEmail(dto.userId, dto.code);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification OTP' })
  @ApiResponse({ status: 200, description: 'Verification OTP sent if email exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resendVerification(@Body() dto: ResendVerificationDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.authService.resendVerificationOtp(dto.email, ipAddress);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  async login(@Body() dto: LoginDto, @Request() req: any): Promise<AuthResponse> {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'Password reset OTP sent if email exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Request() req: any) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.authService.forgotPassword(dto.email, ipAddress);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto, @Request() req: any): Promise<AuthResponse> {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshToken(dto.refreshToken, ipAddress, userAgent);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser() user: any, @Body() body: { refreshToken?: string }) {
    await this.authService.logout(user.id, body.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile with shop details' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }

  // =====================
  // Google OAuth Routes
  // =====================

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiExcludeEndpoint() // Hide from Swagger as it's a redirect
  async googleAuth() {
    // Guard redirects to Google
    // Role is passed as query param: /auth/google?role=SHOPKEEPER
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint() // Hide from Swagger as it's a redirect
  async googleAuthCallback(@Request() req: any, @Res() res: Response) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    
    try {
      const requestedRole = req.user?.requestedRole || 'CUSTOMER';
      const mode = req.user?.mode || 'login';
      const result = await this.authService.googleAuth(req.user, ipAddress, userAgent);
      
      // Check if this is a new SHOPKEEPER registration that needs shop details
      if (requestedRole === 'SHOPKEEPER' && result.needsShopSetup) {
        // Redirect to shop setup page with tokens
        const params = new URLSearchParams({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn.toString(),
          setupRequired: 'shop',
        });
        res.redirect(`${frontendUrl}/auth/oauth-callback?${params.toString()}`);
      } else {
        // Normal flow - redirect with tokens
        const params = new URLSearchParams({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn.toString(),
        });
        res.redirect(`${frontendUrl}/auth/oauth-callback?${params.toString()}`);
      }
    } catch (error) {
      // Handle account not found error for login mode
      if (error?.response?.code === 'ACCOUNT_NOT_FOUND') {
        const params = new URLSearchParams({
          error: 'account_not_found',
          email: error?.response?.email || '',
          message: 'No account found with this email. Please register first.',
        });
        res.redirect(`${frontendUrl}/auth/login?${params.toString()}`);
      } else {
        res.redirect(`${frontendUrl}/auth/login?error=${encodeURIComponent(error.message)}`);
      }
    }
  }
}
