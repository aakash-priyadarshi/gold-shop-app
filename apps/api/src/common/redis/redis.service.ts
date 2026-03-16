import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null = null;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      this.logger.warn(
        "REDIS_URL not found. Redis caching will be disabled.",
      );
      this.client = null;
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on("error", (err) => {
        this.logger.error(`Redis connection error: ${err.message}`);
      });

      this.client.on("connect", () => {
        this.logger.log("Connected to Railway Redis");
      });
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error.message}`);
      this.client = null;
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  /**
   * Keep-alive ping — runs every 3 days
   */
  @Cron("0 0 */3 * *") // At midnight every 3 days
  async keepAlive(): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const result = await this.client!.ping();
      this.logger.log(`Redis keep-alive ping: ${result}`);
    } catch (error) {
      this.logger.error(`Redis keep-alive ping failed: ${error.message}`);
    }
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
      const value = await this.client!.get(key);
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
        await this.client!.set(key, value, "EX", ttlSeconds);
      } else {
        await this.client!.set(key, value);
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
      await this.client!.del(key);
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
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Set multiple hash fields
   */
  async hset(
    key: string,
    data: Record<string, string>,
    ttlSeconds?: number,
  ): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.hset(key, data);
      if (ttlSeconds) {
        await this.client!.expire(key, ttlSeconds);
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
      const result = await this.client!.hgetall(key);
      return result && Object.keys(result).length > 0 ? result : null;
    } catch (error) {
      this.logger.error(`Redis HGETALL error for key ${key}: ${error.message}`);
      return null;
    }
  }

  // ===========================
  // Auth-specific cache methods
  // ===========================

  private readonly EMAIL_CACHE_PREFIX = "auth:email:";
  private readonly PHONE_CACHE_PREFIX = "auth:phone:";
  private readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Cache email existence check result
   */
  async cacheEmailExists(
    email: string,
    exists: boolean,
    userId?: string,
  ): Promise<void> {
    const key = `${this.EMAIL_CACHE_PREFIX}${email.toLowerCase()}`;
    const value = JSON.stringify({
      exists,
      userId: userId || null,
      cachedAt: Date.now(),
    });
    await this.set(key, value, this.CACHE_TTL);
  }

  /**
   * Get cached email existence
   */
  async getCachedEmailExists(
    email: string,
  ): Promise<{ exists: boolean; userId?: string } | null> {
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
  async cachePhoneExists(
    phone: string,
    exists: boolean,
    userId?: string,
  ): Promise<void> {
    const key = `${this.PHONE_CACHE_PREFIX}${phone}`;
    const value = JSON.stringify({
      exists,
      userId: userId || null,
      cachedAt: Date.now(),
    });
    await this.set(key, value, this.CACHE_TTL);
  }

  /**
   * Get cached phone existence
   */
  async getCachedPhoneExists(
    phone: string,
  ): Promise<{ exists: boolean; userId?: string } | null> {
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
