import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [MailModule, PrismaModule],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
