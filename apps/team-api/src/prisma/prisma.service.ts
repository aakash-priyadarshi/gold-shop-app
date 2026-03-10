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
      this.logger.error("Failed to connect to team database", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
