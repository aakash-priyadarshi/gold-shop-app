import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketsGateway } from './tickets.gateway';
import { AiChatbotService } from './ai-chatbot.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [SupportController, TicketsController],
  providers: [SupportService, TicketsService, TicketsGateway, AiChatbotService],
  exports: [SupportService, TicketsService, TicketsGateway],
})
export class SupportModule {}
