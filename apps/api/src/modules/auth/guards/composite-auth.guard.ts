import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ApiTokenService } from "../api-token.service";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Composite Auth Guard for CI/CD endpoints.
 *
 * Accepts either:
 *   1. A JWT Bearer token (validated by JwtService) — for interactive admin sessions
 *   2. A gshop_ API token (validated by ApiTokenService) — for CI/CD pipelines
 *
 * On success, populates `req.user` with { id, email, role, scopes? } so that
 * downstream guards (RolesGuard) work transparently regardless of token type.
 *
 * Requires the `admin:write` scope for API tokens. JWTs bypass scope checks
 * since they already carry the user's role.
 */
@Injectable()
export class CompositeAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly apiTokenService: ApiTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers["authorization"];

    if (!authHeader) {
      throw new UnauthorizedException("Missing Authorization header");
    }

    // ─── Try JWT first ──────────────────────────────────────
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);

      // gshop_ tokens are handled by the API token path below
      if (!token.startsWith("gshop_")) {
        try {
          const payload = await this.jwtService.verifyAsync(token);
          // Verify the user is still active (not suspended/deactivated)
          const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, status: true },
          });
          if (!user || user.status !== "ACTIVE") {
            throw new UnauthorizedException("User account is not active");
          }
          // Populate req.user in the same shape JwtStrategy would
          request.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
          };
          return true;
        } catch (error) {
          if (error instanceof UnauthorizedException) throw error;
          throw new UnauthorizedException("Invalid or expired JWT");
        }
      }

      // ─── gshop_ API token path ───────────────────────────
      const result = await this.apiTokenService.validateToken(token);
      if (!result) {
        throw new UnauthorizedException("Invalid or revoked API token");
      }

      // Check for admin:write scope
      if (!result.scopes.includes("admin:write")) {
        throw new UnauthorizedException(
          "API token lacks required scope: admin:write",
        );
      }

      // Populate req.user so RolesGuard works
      request.user = {
        id: result.userId,
        email: undefined,
        role: result.role,
      };
      return true;
    }

    throw new UnauthorizedException("Unsupported Authorization header format");
  }
}
