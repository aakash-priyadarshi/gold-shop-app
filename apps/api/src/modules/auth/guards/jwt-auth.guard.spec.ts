import { ForbiddenException } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { ApiTokenService } from '../api-token.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard seller smoke tokens', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as unknown as Reflector;
  const apiTokenService = {
    validateSellerSmokeToken: jest.fn(),
  } as unknown as ApiTokenService;
  const moduleRef = {
    get: jest.fn().mockReturnValue(apiTokenService),
  } as unknown as ModuleRef;

  const makeContext = (method = 'GET', originalUrl = '/api/auth/me') => {
    const request: Record<string, any> = {
      method,
      originalUrl,
      headers: { authorization: 'Bearer gshop_monitor-token' },
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
      request,
    } as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    (apiTokenService.validateSellerSmokeToken as jest.Mock).mockResolvedValue({
      userId: 'seller-1',
      email: 'seller@example.com',
      role: 'SHOPKEEPER',
      firstName: 'Test',
      lastName: 'Seller',
      preferredLanguage: 'en',
      shopId: 'shop-1',
      scopes: ['seller:smoke'],
    });
  });

  it('authenticates a valid smoke token as its bound shopkeeper on GET requests', async () => {
    const guard = new JwtAuthGuard(reflector, moduleRef);
    const context = makeContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.request.user).toMatchObject({
      id: 'seller-1',
      shopId: 'shop-1',
      activeShopId: 'shop-1',
      tokenType: 'seller-smoke',
    });
  });

  it('blocks writes before a smoke token can reach a seller controller', async () => {
    const guard = new JwtAuthGuard(reflector, moduleRef);

    await expect(guard.canActivate(makeContext('POST'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(apiTokenService.validateSellerSmokeToken).not.toHaveBeenCalled();
  });

  it('does not grant a seller token access to unrelated authenticated routes', async () => {
    const guard = new JwtAuthGuard(reflector, moduleRef);

    await expect(
      guard.canActivate(makeContext('GET', '/api/admin/users')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(apiTokenService.validateSellerSmokeToken).not.toHaveBeenCalled();
  });
});
