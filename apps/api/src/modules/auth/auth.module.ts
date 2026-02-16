import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { HttpClientModule } from "../../common";
import { AuditModule } from "../audit/audit.module";
import { MailModule } from "../mail/mail.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";
import { ApiTokenController } from "./api-token.controller";
import { ApiTokenService } from "./api-token.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OtpController } from "./otp.controller";
import { OtpService } from "./otp.service";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { TurnstileService } from "./turnstile.service";
import { TwoFactorController } from "./two-factor.controller";
import { TwoFactorService } from "./two-factor.service";

@Module({
  imports: [
    UsersModule,
    AuditModule,
    NotificationsModule,
    MailModule,
    HttpClientModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>("JWT_SECRET");
        if (!secret) {
          throw new Error(
            "CRITICAL: JWT_SECRET environment variable is not set. " +
            "The application cannot start without a secure JWT secret.",
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>("JWT_EXPIRY") || "24h",
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthController,
    ApiTokenController,
    OtpController,
    TwoFactorController,
  ],
  providers: [
    AuthService,
    ApiTokenService,
    OtpService,
    TwoFactorService,
    TurnstileService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
  ],
  exports: [
    AuthService,
    ApiTokenService,
    OtpService,
    TwoFactorService,
    TurnstileService,
  ],
})
export class AuthModule {}
