import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SecurityService } from "./security.service";

/**
 * Metadata key to skip security analysis on specific routes
 * (e.g. health checks, metrics endpoints).
 */
export const SKIP_SECURITY_KEY = "skipSecurity";

/**
 * Decorator to skip security guard on a controller or handler.
 * Usage: @SkipSecurity()
 */
import { SetMetadata } from "@nestjs/common";
export const SkipSecurity = () => SetMetadata(SKIP_SECURITY_KEY, true);

@Injectable()
export class SecurityGuard implements CanActivate {
  private readonly logger = new Logger(SecurityGuard.name);

  constructor(
    private readonly securityService: SecurityService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is opted out
    const skipSecurity = this.reflector.getAllAndOverride<boolean>(
      SKIP_SECURITY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipSecurity) return true;

    const request = context.switchToHttp().getRequest();
    if (!request) return true; // WebSocket or non-HTTP context

    const ip = this.extractIp(request);
    const route = request.route?.path || request.url || "";
    const method = request.method || "GET";
    const userAgent = request.headers?.["user-agent"] || "";
    const userId = request.user?.id;

    // Quick check: is IP blocked?
    const blocked = await this.securityService.isBlocked(ip);
    if (blocked) {
      this.logger.warn(
        `🚫 Blocked IP tried to access: ${ip} → ${method} ${route}`,
      );
      throw new HttpException(
        { statusCode: 403, message: "Access denied", error: "Forbidden" },
        HttpStatus.FORBIDDEN,
      );
    }

    // Analyze request for threats (injection, suspicious agent, etc.)
    const result = await this.securityService.analyzeRequest({
      ip,
      method,
      route,
      userAgent,
      userId,
      body: request.body,
    });

    if (result.blocked) {
      this.logger.warn(
        `🛡️ Request blocked by security analysis: ${ip} → ${method} ${route} (${result.threats.length} threats)`,
      );
      throw new HttpException(
        {
          statusCode: 403,
          message: "Request blocked by security policy",
          error: "Forbidden",
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }

  private extractIp(request: any): string {
    // Respect proxy headers (Cloudflare, Railway, etc.)
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
