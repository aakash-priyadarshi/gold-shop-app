import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FxRatesModule } from '../fx-rates/fx-rates.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [PrismaModule, NotificationsModule, FxRatesModule, AccountingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
