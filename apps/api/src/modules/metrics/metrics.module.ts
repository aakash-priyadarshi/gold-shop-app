import { Global, Module, OnModuleInit } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "../../prisma/prisma.module";
import { PrismaService } from "../../prisma/prisma.service";
import { CronMetricsService } from "./cron-metrics.service";
import { DesktopSessionController } from "./desktop-session.controller";
import { DesktopSessionService } from "./desktop-session.service";
import { DynamicCronService } from "./dynamic-cron.service";
import { MetricsSnapshotService } from "./metrics-snapshot.service";
import { MetricsController } from "./metrics.controller";
import { MetricsInterceptor } from "./metrics.interceptor";
import { MetricsService } from "./metrics.service";
import { WebSessionController } from "./web-session.controller";
import { WebSessionService } from "./web-session.service";

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [MetricsController, WebSessionController, DesktopSessionController],
  providers: [
    MetricsService,
    MetricsSnapshotService,
    CronMetricsService,
    DynamicCronService,
    WebSessionService,
    DesktopSessionService,
    // Register interceptor globally so every HTTP request is tracked
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsService, MetricsSnapshotService, CronMetricsService, DynamicCronService, WebSessionService, DesktopSessionService],
})
export class MetricsModule implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  onModuleInit() {
    // Wire MetricsService into PrismaService for DB query tracking
    // (avoids circular dependency: MetricsModule imports PrismaModule)
    this.prisma.setMetricsService(this.metricsService);
  }
}
