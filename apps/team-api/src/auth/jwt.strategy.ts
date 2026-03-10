import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

/**
 * JWT Strategy for Team API.
 * Validates tokens issued by the MAIN Orivraa API (same JWT_SECRET).
 * Only ADMIN, SUPPORT, SALES roles from the main app are allowed.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException("Invalid token");
    }

    const allowedRoles = ["ADMIN", "SUPPORT", "SALES"];
    if (!allowedRoles.includes(payload.role)) {
      throw new UnauthorizedException("Access denied. Employee roles only.");
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      shopId: payload.shopId,
    };
  }
}
