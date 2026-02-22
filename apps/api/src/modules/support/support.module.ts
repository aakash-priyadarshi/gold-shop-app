import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionPlansModule } from "../subscriptions/subscription-plans.module";
import { AiChatbotService } from "./ai-chatbot.service";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";
import { TicketsController } from "./tickets.controller";
import { TicketsGateway } from "./tickets.gateway";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [
    NotificationsModule,
    SubscriptionPlansModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get("JWT_SECRET"),
      }),
    }),
  ],
  controllers: [SupportController, TicketsController],
  providers: [SupportService, TicketsService, TicketsGateway, AiChatbotService],
  exports: [SupportService, TicketsService, TicketsGateway],
})
export class SupportModule {}
