import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../redis/redis.service';

/** Metadata key for cache TTL */
export const CACHE_TTL_KEY = 'cache_ttl';

/**
 * Decorator to set Redis cache TTL on a controller method.
 * Only works on GET endpoints.
 * @param ttlSeconds Time-to-live in seconds
 */
export const CacheTTL = (ttlSeconds: number) =>
  SetMetadata(CACHE_TTL_KEY, ttlSeconds);

/** Metadata key to skip caching entirely */
export const CACHE_SKIP_KEY = 'cache_skip';

/**
 * Decorator to skip caching for a specific endpoint.
 */
export const SkipCache = () => SetMetadata(CACHE_SKIP_KEY, true);

/**
 * Redis-backed HTTP response cache interceptor.
 *
 * - Only caches GET requests
 * - Uses the full URL (path + query string) as cache key
 * - TTL is set per-endpoint via @CacheTTL(seconds) decorator
 * - Falls back to handler execution if Redis is unavailable
 * - Adds X-Cache: HIT/MISS header for observability
 */
@Injectable()
export class RedisCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RedisCacheInterceptor.name);
  private readonly KEY_PREFIX = 'http_cache:';

  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check if caching is explicitly skipped
    const skipCache = this.reflector.getAllAndOverride<boolean>(CACHE_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCache) {
      return next.handle();
    }

    // Get TTL from decorator — if not set, don't cache
    const ttl = this.reflector.getAllAndOverride<number>(CACHE_TTL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!ttl) {
      return next.handle();
    }

    // Build cache key from URL
    const url = request.originalUrl || request.url;
    const cacheKey = `${this.KEY_PREFIX}${url}`;

    // Try to get from cache
    if (this.redis.isAvailable()) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          response.setHeader('X-Cache', 'HIT');
          this.logger.debug(`Cache HIT: ${url}`);
          // Parse the cached JSON and return as observable
          const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
          return of(parsed);
        }
      } catch (error) {
        this.logger.warn(`Cache read error for ${url}: ${error.message}`);
      }
    }

    // Cache MISS — execute handler and cache the result
    response.setHeader('X-Cache', 'MISS');
    this.logger.debug(`Cache MISS: ${url}`);

    return next.handle().pipe(
      tap(async (data) => {
        if (this.redis.isAvailable() && data !== undefined && data !== null) {
          try {
            await this.redis.set(cacheKey, JSON.stringify(data), ttl);
          } catch (error) {
            this.logger.warn(`Cache write error for ${url}: ${error.message}`);
          }
        }
      }),
    );
  }
}
