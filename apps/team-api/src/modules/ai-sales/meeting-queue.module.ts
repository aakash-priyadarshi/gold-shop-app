import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

/**
 * Meeting Queue Module
 *
 * Configures BullMQ with Redis for exact-time job scheduling:
 * - meeting-reminders: 24h and 30m reminders
 * - meeting-launch: auto-launch agents at scheduled time
 *
 * Requires REDIS_URL environment variable.
 * Falls back to localhost:6379 if not set (for local dev).
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>("REDIS_URL");
        if (redisUrl) {
          const url = new URL(redisUrl);
          return {
            connection: {
              host: url.hostname,
              port: parseInt(url.port) || 6379,
              password: url.password || undefined,
              tls: url.protocol === "rediss:" ? {} : undefined,
            },
          };
        }
        // Fallback to localhost for local dev
        return {
          connection: { host: "localhost", port: 6379 },
        };
      },
    }),
    BullModule.registerQueue(
      { name: "meeting-reminders" },
      { name: "meeting-launch" },
    ),
  ],
  exports: [BullModule],
})
export class MeetingQueueModule {}
