import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { HttpClientModule } from './common/http-client';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ShopsModule } from './modules/shops/shops.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { RfqModule } from './modules/rfq/rfq.module';
import { OffersModule } from './modules/offers/offers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { AuditModule } from './modules/audit/audit.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { MarketRatesModule } from './modules/market-rates/market-rates.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1 minute
      limit: 100,  // 100 requests per minute
    }]),

    // Redis/Bull queues for background jobs
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    // Database
    PrismaModule,

    // Shared HTTP client with retries
    HttpClientModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ShopsModule,
    InventoryModule,
    RfqModule,
    OffersModule,
    OrdersModule,
    PaymentsModule,
    NotificationsModule,
    MaterialsModule,
    MarketRatesModule,
    PricingModule,
    AuditModule,
    JobsModule,
    HealthModule,
  ],
})
export class AppModule {}
