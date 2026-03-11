import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "info", "warn", "error"]
          : ["error"],
      datasources: {
        db: { url: process.env.TEAM_DATABASE_URL },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Team database connected");
    } catch (error) {
      this.logger.error("Failed to connect to team database — will retry in background", (error as Error).message);
      this.retryConnect();
    }
  }

  private retryConnect(attempt = 1) {
    const delay = Math.min(5_000 * attempt, 30_000);
    setTimeout(async () => {
      try {
        await this.$connect();
        this.logger.log("Team database connected (retry)");
      } catch {
        if (attempt < 10) {
          this.logger.warn(`DB reconnect attempt ${attempt} failed, retrying...`);
          this.retryConnect(attempt + 1);
        } else {
          this.logger.error("DB connection failed after 10 retries");
        }
      }
    }, delay);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
