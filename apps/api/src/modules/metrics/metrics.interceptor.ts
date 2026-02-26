import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const { method } = request;

    // Normalize route — use the NestJS resolved route pattern when available
    const route =
      request.route?.path || request.url?.split("?")[0] || "unknown";

    // Track in-flight requests
    this.metricsService.httpRequestsInFlight.inc();
    const startTime = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse();
          const statusCode = String(response.statusCode || 200);
          const durationSec = this.getDurationInSeconds(startTime);

          this.metricsService.httpRequestsTotal.inc({
            method,
            route,
            status_code: statusCode,
          });
          this.metricsService.httpRequestDuration.observe(
            { method, route, status_code: statusCode },
            durationSec,
          );
          this.metricsService.httpRequestsInFlight.dec();
        },
        error: (err: any) => {
          const statusCode = String(err?.status || err?.statusCode || 500);
          const durationSec = this.getDurationInSeconds(startTime);

          this.metricsService.httpRequestsTotal.inc({
            method,
            route,
            status_code: statusCode,
          });
          this.metricsService.httpRequestDuration.observe(
            { method, route, status_code: statusCode },
            durationSec,
          );
          this.metricsService.httpRequestsInFlight.dec();
        },
      }),
    );
  }

  private getDurationInSeconds(startTime: bigint): number {
    const diff = process.hrtime.bigint() - startTime;
    return Number(diff) / 1e9; // nanoseconds → seconds
  }
}
