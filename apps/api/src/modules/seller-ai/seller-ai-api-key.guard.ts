import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiKeyService } from "../enterprise/services/api-key.service";

export interface SellerAiApiKeyContext {
  id: string;
  shopId: string;
  shop: { id: string; shopName: string; userId: string; isActive: boolean };
  scopes: string[];
  keyName: string;
  keyPrefix: string;
  kind: string;
}

@Injectable()
export class SellerAiApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers?.authorization;
    const authorization =
      typeof authorizationHeader === "string" ? authorizationHeader : undefined;
    const fromBearer = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;
    const apiKeyHeader = request.headers?.["x-api-key"];
    const rawKey =
      fromBearer ||
      (typeof apiKeyHeader === "string" ? apiKeyHeader : undefined);

    if (!rawKey) {
      throw new UnauthorizedException("A seller AI API key is required");
    }

    const key = await this.apiKeyService.validateSellerAiKey(rawKey);
    if (!key) {
      throw new UnauthorizedException(
        "Invalid, expired, revoked, or inactive seller AI API key",
      );
    }

    request.sellerAiKey = key satisfies SellerAiApiKeyContext;
    return true;
  }
}
