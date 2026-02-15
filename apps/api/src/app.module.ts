import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

// Core modules
import { HttpClientModule } from "./common/http-client";
import { RedisModule } from "./common/redis";
import { AdminModule } from "./modules/admin/admin.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CommissionModule } from "./modules/commission/commission.module";
import { CustomerCrmModule } from "./modules/customer-crm/customer-crm.module";
import { DesignsModule } from "./modules/designs/designs.module";
import { HealthModule } from "./modules/health/health.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { MailModule } from "./modules/mail/mail.module";
import { MarketConfigModule } from "./modules/market-config/market-config.module";
import { MarketRatesModule } from "./modules/market-rates/market-rates.module";
import { MarketplaceIntelligenceModule } from "./modules/marketplace-intelligence/marketplace-intelligence.module";
import { MaterialsModule } from "./modules/materials/materials.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OffersModule } from "./modules/offers/offers.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PlatformConfigModule } from "./modules/platform-config/platform-config.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { RfqModule } from "./modules/rfq/rfq.module";
import { SellerPerformanceModule } from "./modules/seller-performance/seller-performance.module";
import { ShopQuotesModule } from "./modules/shop-quotes/shop-quotes.module";
import { ShopsModule } from "./modules/shops/shops.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Redis/Bull queues for background jobs
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
    }),

    // Database
    PrismaModule,

    // Global Redis cache
    RedisModule,

    // Shared HTTP client with retries
    HttpClientModule,

    // Global Mail service
    MailModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ShopsModule,
    InventoryModule,
    RfqModule,
    OffersModule,
    OrdersModule,
    InvoicesModule,
    PaymentsModule,
    NotificationsModule,
    MaterialsModule,
    MarketRatesModule,
    PricingModule,
    AuditModule,
    JobsModule,
    HealthModule,
    AdminModule,
    MarketConfigModule,
    CommissionModule,
    ShopQuotesModule,
    DesignsModule,
    PlatformConfigModule,
    SellerPerformanceModule,
    CustomerCrmModule,
    MarketplaceIntelligenceModule,
  ],
})
export class AppModule {}
