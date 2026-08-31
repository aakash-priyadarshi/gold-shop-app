import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { firstValueFrom, isObservable } from 'rxjs';
import { ApiTokenService } from '../api-token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const SELLER_SMOKE_READ_PATHS = new Set([
  '/api/auth/me',
  '/api/invoices',
  '/api/invoices/settings',
  '/api/inventory',
  '/api/karigar/snapshot',
  '/api/market-rates',
  '/api/pos/session/active',
  '/api/pricing/tax/summary',
  '/api/shop-quotes',
  '/api/shops/my-shop/component-pricing',
  '/api/shops/my-shop/materials',
]);

function isAllowedSellerSmokeRequest(request: { originalUrl?: string; url?: string }): boolean {
  const path = (request.originalUrl || request.url || '').split('?')[0];
  return (
    SELLER_SMOKE_READ_PATHS.has(path) ||
    /^\/api\/invoices\/[^/]+\/pdf$/.test(path)
  );
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization as string | undefined;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;

    // A managed seller smoke token is intentionally the only opaque API token
    // accepted here. It is bound to one shop and restricted to canary reads.
    if (token?.startsWith('gshop_')) {
      if (!['GET', 'HEAD'].includes(request.method)) {
        throw new ForbiddenException('Seller smoke tokens are read-only');
      }
      if (!isAllowedSellerSmokeRequest(request)) {
        throw new ForbiddenException('Seller smoke token cannot access this route');
      }
      const apiTokenService = this.moduleRef.get(ApiTokenService, { strict: false });
      const sellerToken = await apiTokenService.validateSellerSmokeToken(token);
      if (!sellerToken) {
        throw new UnauthorizedException('Invalid, revoked, or inactive seller smoke token');
      }

      request.user = {
        id: sellerToken.userId,
        email: sellerToken.email,
        role: sellerToken.role,
        firstName: sellerToken.firstName,
        lastName: sellerToken.lastName,
        preferredLanguage: sellerToken.preferredLanguage,
        shopId: sellerToken.shopId,
        activeShopId: sellerToken.shopId,
        scopes: sellerToken.scopes,
        tokenType: 'seller-smoke',
      };
      return true;
    }

    const passportResult = super.canActivate(context);
    return isObservable(passportResult)
      ? firstValueFrom(passportResult)
      : await passportResult;
  }
}
