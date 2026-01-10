import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Add middleware to handle connection errors and reconnect
    this.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (error: any) {
        // Handle Neon connection closed errors
        if (
          error.message?.includes('Closed') ||
          error.message?.includes('Connection') ||
          error.code === 'P2024' ||
          error.code === 'P1001' ||
          error.code === 'P1002'
        ) {
          this.logger.warn('Database connection lost, attempting to reconnect...');
          this.isConnected = false;
          await this.reconnect();
          // Retry the operation once after reconnect
          return await next(params);
        }
        throw error;
      }
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.isConnected = false;
  }

  private async connectWithRetry(maxRetries = 5): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.$connect();
        this.isConnected = true;
        this.logger.log('Database connected successfully');
        return;
      } catch (error: any) {
        this.logger.error(`Database connection attempt ${i + 1}/${maxRetries} failed:`, error.message);
        if (i < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, i), 10000); // Exponential backoff, max 10s
          this.logger.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }

  private async reconnect(): Promise<void> {
    try {
      await this.$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
    await this.connectWithRetry(3);
  }

  // Handle connection errors gracefully
  async executeWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        if (i === retries - 1) throw error;
        if (
          error.code === 'P2024' || 
          error.code === 'P1001' ||
          error.code === 'P1002' ||
          error.message?.includes('Connection') ||
          error.message?.includes('Closed')
        ) {
          this.logger.warn(`Database connection error, retrying... (${i + 1}/${retries})`);
          await this.reconnect();
        } else {
          throw error;
        }
      }
    }
    throw new Error('Max retries reached');
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // Clean database for testing
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be used in test environment');
    }
    
    const tablenames = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    try {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    } catch (error) {
      console.log({ error });
    }
  }
}
