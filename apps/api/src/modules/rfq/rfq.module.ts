import { Module } from '@nestjs/common';
import { RfqController } from './rfq.controller';
import { RfqService } from './rfq.service';
import { ShopsModule } from '../shops/shops.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { MarketRatesModule } from '../market-rates/market-rates.module';

@Module({
  imports: [ShopsModule, NotificationsModule, AuditModule, MarketRatesModule],
  controllers: [RfqController],
  providers: [RfqService],
  exports: [RfqService],
})
export class RfqModule {}
