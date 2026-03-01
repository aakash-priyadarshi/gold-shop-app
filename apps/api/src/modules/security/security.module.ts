import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../../prisma/prisma.module';
import { SecurityService } from './security.service';
import { SecurityGuard } from './security.guard';
import { SecurityInterceptor } from './security.interceptor';
import { SecurityController } from './security.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SecurityController],
  providers: [
    SecurityService,
    // Register as global guard — runs on every request (after ThrottlerGuard)
    {
      provide: APP_GUARD,
      useClass: SecurityGuard,
    },
    // Register as global interceptor — detects threats from response codes
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityInterceptor,
    },
  ],
  exports: [SecurityService],
})
export class SecurityModule {}
