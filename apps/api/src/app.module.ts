import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

// Core modules
import { HttpClientModule } from "./common/http-client";
import { RedisCacheInterceptor } from "./common/interceptors/cache.interceptor";
import { RedisModule } from "./common/redis";
import { AdminModule } from "./modules/admin/admin.module";
import { AiCreditsModule } from "./modules/ai-credits/ai-credits.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CatalogueModule } from "./modules/catalogue/catalogue.module";
import { ChatModule } from "./modules/chat/chat.module";
import { CommissionModule } from "./modules/commission/commission.module";
import { CustomerCrmModule } from "./modules/customer-crm/customer-crm.module";
import { DesignsModule } from "./modules/designs/designs.module";
import { EnterpriseModule } from "./modules/enterprise/enterprise.module";
import { HealthModule } from "./modules/health/health.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { MailModule } from "./modules/mail/mail.module";
import { MarketConfigModule } from "./modules/market-config/market-config.module";
import { MarketRatesModule } from "./modules/market-rates/market-rates.module";
import { MarketplaceIntelligenceModule } from "./modules/marketplace-intelligence/marketplace-intelligence.module";
import { MaterialsModule } from "./modules/materials/materials.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OffersModule } from "./modules/offers/offers.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PagesModule } from "./modules/pages/pages.module";
import { PaymentGatewayModule } from "./modules/payment-gateway/payment-gateway.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PlatformConfigModule } from "./modules/platform-config/platform-config.module";
import { PosModule } from "./modules/pos/pos.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { ProductVariantsModule } from "./modules/product-variants/product-variants.module";
import { RefundsModule } from "./modules/refunds/refunds.module";
import { RfqModule } from "./modules/rfq/rfq.module";
import { SecurityModule } from "./modules/security/security.module";
import { SellerPerformanceModule } from "./modules/seller-performance/seller-performance.module";
import { ShopQuotesModule } from "./modules/shop-quotes/shop-quotes.module";
import { ShopsModule } from "./modules/shops/shops.module";
import { SubscriptionPlansModule } from "./modules/subscriptions/subscription-plans.module";
import { SupportModule } from "./modules/support/support.module";
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
    PagesModule,
    InvoicesModule,
    PaymentsModule,
    NotificationsModule,
    MaterialsModule,
    MarketRatesModule,
    PricingModule,
    AuditModule,
    JobsModule,
    HealthModule,
    MetricsModule,
    SecurityModule,
    AdminModule,
    MarketConfigModule,
    CommissionModule,
    ShopQuotesModule,
    DesignsModule,
    PlatformConfigModule,
    SellerPerformanceModule,
    CustomerCrmModule,
    MarketplaceIntelligenceModule,
    ChatModule,
    CatalogueModule,
    RefundsModule,
    SupportModule,
    ProductVariantsModule,
    PosModule,
    SubscriptionPlansModule,
    AiCreditsModule,
    PaymentGatewayModule,
    EnterpriseModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally so @Throttle() decorators are enforced
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Redis response cache — only activates on endpoints with @CacheTTL()
    {
      provide: APP_INTERCEPTOR,
      useClass: RedisCacheInterceptor,
    },
  ],
})
export class AppModule {}
