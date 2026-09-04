import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";

// Core modules
import { HttpClientModule } from "./common/http-client";
import { RedisCacheInterceptor } from "./common/interceptors/cache.interceptor";
import { RedisModule } from "./common/redis";
import { AdminModule } from "./modules/admin/admin.module";
import { AccountingModule } from "./modules/accounting/accounting.module";
import { AiCreditsModule } from "./modules/core/ai-credits/ai-credits.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BackupModule } from "./modules/backup/backup.module";
import { BlogModule } from "./modules/blog/blog.module";
import { CatalogueModule } from "./modules/catalogue/catalogue.module";
import { ChatModule } from "./modules/chat/chat.module";
import { CommissionModule } from "./modules/core/commission/commission.module";
import { ContactModule } from "./modules/contact/contact.module";
import { CrashReportsModule } from "./modules/crash-reports/crash-reports.module";
import { CustomerCrmModule } from "./modules/customer-crm/customer-crm.module";
import { DesignsModule } from "./modules/designs/designs.module";
import { EnterpriseModule } from "./modules/enterprise/enterprise.module";
import { HealthModule } from "./modules/health/health.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { MailModule } from "./modules/mail/mail.module";
import { MarketConfigModule } from "./modules/market-config/market-config.module";
import { MarketRatesModule } from "./modules/core/market-rates/market-rates.module";
import { MarketplaceIntelligenceModule } from "./modules/core/marketplace-intelligence/marketplace-intelligence.module";
import { MaterialsModule } from "./modules/materials/materials.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OffersModule } from "./modules/core/offers/offers.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PagesModule } from "./modules/pages/pages.module";
import { PaymentGatewayModule } from "./modules/core/payment-gateway/payment-gateway.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PlatformConfigModule } from "./modules/platform-config/platform-config.module";
import { PosModule } from "./modules/core/pos/pos.module";
import { PricingModule } from "./modules/core/pricing/pricing.module";
import { ProductVariantsModule } from "./modules/product-variants/product-variants.module";
import { RefundsModule } from "./modules/core/refunds/refunds.module";
import { ReleasesModule } from "./modules/releases/releases.module";
import { PlanQuotesModule } from "./modules/plan-quotes/plan-quotes.module";
import { RecoveryOffersModule } from "./modules/recovery-offers/recovery-offers.module";
import { RepairsModule } from "./modules/repairs/repairs.module";
import { GoldLoansModule } from "./modules/gold-loans/gold-loans.module";
import { KarigarModule } from "./modules/karigar/karigar.module";
import { RfqModule } from "./modules/core/rfq/rfq.module";
import { SavingsModule } from "./modules/savings/savings.module";
import { ChitModule } from "./modules/chit/chit.module";
import { SecurityModule } from "./modules/security/security.module";
import { SellerPerformanceModule } from "./modules/core/seller-performance/seller-performance.module";
import { SellerAiModule } from "./modules/seller-ai/seller-ai.module";
import { ShopQuotesModule } from "./modules/core/shop-quotes/shop-quotes.module";
import { ShopsModule } from "./modules/shops/shops.module";
import { SubscriptionPlansModule } from "./modules/core/subscriptions/subscription-plans.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { SupportModule } from "./modules/support/support.module";
import { TaxReportsModule } from "./modules/core/tax-reports/tax-reports.module";
import { TestingModule } from "./modules/testing/testing.module";
import { TranslationModule } from "./modules/translation/translation.module";
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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>("REDIS_URL");
        if (redisUrl) {
          try {
            const url = new URL(redisUrl);
            return {
              redis: {
                host: url.hostname,
                port: parseInt(url.port) || 6379,
                password: url.password || undefined,
              },
            };
          } catch (e) {
            // fallback if URL is invalid
          }
        }
        return {
          redis: {
            host: config.get<string>("REDIS_HOST") || "localhost",
            port: parseInt(config.get<string>("REDIS_PORT") || "6379"),
            password: config.get<string>("REDIS_PASSWORD"),
          },
        };
      },
    }),

    // Database
    PrismaModule,

    // Scheduling
    ScheduleModule.forRoot(),

    // Global Redis cache
    RedisModule,

    // Shared HTTP client with retries
    HttpClientModule,

    // Global Mail service
    MailModule,

    // Feature modules
    AuthModule,
    AccountingModule,
    UsersModule,
    ShopsModule,
    InventoryModule,
    RfqModule,
    OffersModule,
    OrdersModule,
    PagesModule,
    BlogModule,
    InvoicesModule,
    TaxReportsModule,
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
    ContactModule,
    ShopQuotesModule,
    DesignsModule,
    PlatformConfigModule,
    SellerPerformanceModule,
    SellerAiModule,
    CustomerCrmModule,
    MarketplaceIntelligenceModule,
    ChatModule,
    CatalogueModule,
    CrashReportsModule,
    RefundsModule,
    ReleasesModule,
    PlanQuotesModule,
    RecoveryOffersModule,
    RepairsModule,
    SavingsModule,
    ChitModule,
    GoldLoansModule,
    KarigarModule,
    SupportModule,
    LeadsModule,
    ProductVariantsModule,
    PosModule,
    SubscriptionPlansModule,
    AiCreditsModule,
    PaymentGatewayModule,
    EnterpriseModule,
    TranslationModule,
    TestingModule,
    BackupModule,
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
