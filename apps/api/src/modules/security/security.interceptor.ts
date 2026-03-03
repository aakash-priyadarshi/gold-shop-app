import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { SecurityService } from "./security.service";

/**
 * Intercepts responses to detect threats from response status codes:
 * - 401 → possible brute force
 * - 403 → forbidden access attempts
 * - 404 → possible API fuzzing / enumeration
 * - 429 → rate limit hit
 */
@Injectable()
export class SecurityInterceptor implements NestInterceptor {
  constructor(private readonly securityService: SecurityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!request) return next.handle();

    const ip = this.extractIp(request);
    const route = request.route?.path || request.url || "";
    const method = request.method || "GET";
    const userAgent = request.headers?.["user-agent"] || "";
    const userId = request.user?.id;

    return next.handle().pipe(
      tap({
        error: (err) => {
          const status = err?.status || err?.statusCode || 500;

          if (status === 401) {
            // Failed auth — may indicate brute force
            this.securityService
              .recordFailedLogin(ip, route, userId, userAgent)
              .catch(() => {});
          } else if (status === 403) {
            // Only record forbidden if the IP isn't already blocked by the guard.
            // Otherwise we create a feedback loop: guard blocks → 403 → recordForbidden
            // → score increases → more events logged → repeat on every request.
            this.securityService
              .isBlocked(ip)
              .then((blocked) => {
                if (!blocked) {
                  this.securityService
                    .recordForbidden(ip, route, method, userId, userAgent)
                    .catch(() => {});
                }
              })
              .catch(() => {});
          } else if (status === 404) {
            this.securityService
              .recordNotFound(ip, route, method, userAgent)
              .catch(() => {});
          } else if (status === 429) {
            this.securityService
              .recordRateLimited(ip, route, method, userAgent)
              .catch(() => {});
          }
        },
      }),
    );
  }

  private extractIp(request: any): string {
    return (
      request.headers?.["cf-connecting-ip"] ||
      request.headers?.["x-real-ip"] ||
      request.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
      request.ip ||
      request.connection?.remoteAddress ||
      "0.0.0.0"
    );
  }
}
