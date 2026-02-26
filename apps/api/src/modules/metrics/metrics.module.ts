import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "../../prisma/prisma.module";
import { MetricsSnapshotService } from "./metrics-snapshot.service";
import { MetricsController } from "./metrics.controller";
import { MetricsInterceptor } from "./metrics.interceptor";
import { MetricsService } from "./metrics.service";

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    MetricsSnapshotService,
    // Register interceptor globally so every HTTP request is tracked
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsService, MetricsSnapshotService],
})
export class MetricsModule {}
