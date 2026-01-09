import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiTokenController } from './api-token.controller';
import { ApiTokenService } from './api-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    UsersModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'gold-shop-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRY') || '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, ApiTokenController],
  providers: [AuthService, ApiTokenService, JwtStrategy, LocalStrategy],
  exports: [AuthService, ApiTokenService],
})
export class AuthModule {}
