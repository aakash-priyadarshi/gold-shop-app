import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { EmailTemplateService } from './email-template.service';
import { WebhookController } from './webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [WebhookController],
  providers: [MailService, EmailTemplateService],
  exports: [MailService, EmailTemplateService],
})
export class MailModule {}
