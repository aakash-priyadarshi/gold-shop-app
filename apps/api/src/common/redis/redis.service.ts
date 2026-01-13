import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!restUrl || !restToken) {
      this.logger.warn('Upstash Redis credentials not found. Redis caching will be disabled.');
      // Create a dummy client that won't be used
      this.client = null as any;
      return;
    }

    this.client = new Redis({
      url: restUrl,
      token: restToken,
    });

    this.logger.log('Connected to Upstash Redis');
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      const value = await this.client.get<string>(key);
      return value;
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set a value in Redis with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete a key from Redis
   */
  async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Set multiple hash fields
   */
  async hset(key: string, data: Record<string, string>, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client.hset(key, data);
      if (ttlSeconds) {
        await this.client.expire(key, ttlSeconds);
      }
    } catch (error) {
      this.logger.error(`Redis HSET error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Get all hash fields
   */
  async hgetall(key: string): Promise<Record<string, string> | null> {
    if (!this.isAvailable()) return null;
    try {
      const result = await this.client.hgetall<Record<string, string>>(key);
      return result && Object.keys(result).length > 0 ? result : null;
    } catch (error) {
      this.logger.error(`Redis HGETALL error for key ${key}: ${error.message}`);
      return null;
    }
  }

  // ===========================
  // Auth-specific cache methods
  // ===========================

  private readonly EMAIL_CACHE_PREFIX = 'auth:email:';
  private readonly PHONE_CACHE_PREFIX = 'auth:phone:';
  private readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Cache email existence check result
   */
  async cacheEmailExists(email: string, exists: boolean, userId?: string): Promise<void> {
    const key = `${this.EMAIL_CACHE_PREFIX}${email.toLowerCase()}`;
    const value = JSON.stringify({ exists, userId: userId || null, cachedAt: Date.now() });
    await this.set(key, value, this.CACHE_TTL);
  }

  /**
   * Get cached email existence
   */
  async getCachedEmailExists(email: string): Promise<{ exists: boolean; userId?: string } | null> {
    const key = `${this.EMAIL_CACHE_PREFIX}${email.toLowerCase()}`;
    const value = await this.get(key);
    if (value) {
      try {
        const parsed = JSON.parse(value);
        return { exists: parsed.exists, userId: parsed.userId };
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Invalidate email cache (when user is created/deleted)
   */
  async invalidateEmailCache(email: string): Promise<void> {
    const key = `${this.EMAIL_CACHE_PREFIX}${email.toLowerCase()}`;
    await this.del(key);
  }

  /**
   * Cache phone existence check result
   */
  async cachePhoneExists(phone: string, exists: boolean, userId?: string): Promise<void> {
    const key = `${this.PHONE_CACHE_PREFIX}${phone}`;
    const value = JSON.stringify({ exists, userId: userId || null, cachedAt: Date.now() });
    await this.set(key, value, this.CACHE_TTL);
  }

  /**
   * Get cached phone existence
   */
  async getCachedPhoneExists(phone: string): Promise<{ exists: boolean; userId?: string } | null> {
    const key = `${this.PHONE_CACHE_PREFIX}${phone}`;
    const value = await this.get(key);
    if (value) {
      try {
        const parsed = JSON.parse(value);
        return { exists: parsed.exists, userId: parsed.userId };
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Invalidate phone cache (when user is created/deleted or phone changed)
   */
  async invalidatePhoneCache(phone: string): Promise<void> {
    const key = `${this.PHONE_CACHE_PREFIX}${phone}`;
    await this.del(key);
  }
}

