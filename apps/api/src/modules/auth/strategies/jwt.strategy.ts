import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { JwtPayload } from "../auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { shops: true },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Only block deactivated users — suspended users must stay logged in
    // so they can see the suspension overlay and access help/support
    if (user.status === "DEACTIVATED") {
      throw new UnauthorizedException("Account is not active");
    }

    // Get active shop from user's shops (prefer activeShopId if set)
    const activeShop = user.activeShopId
      ? user.shops?.find((s) => s.id === user.activeShopId)
      : user.shops?.[0];

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      shopId: activeShop?.id,
      preferredLanguage: user.preferredLanguage,
    };
  }
}
