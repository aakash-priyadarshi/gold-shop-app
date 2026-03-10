import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

/**
 * JWT Strategy for Team API.
 * Validates tokens issued by the MAIN Orivraa API (same JWT_SECRET).
 * No DB lookup needed — we trust the payload from the main app.
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

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,         // from main app: ADMIN, SHOPKEEPER, USER
      firstName: payload.firstName,
      lastName: payload.lastName,
      shopId: payload.shopId,
    };
  }
}
