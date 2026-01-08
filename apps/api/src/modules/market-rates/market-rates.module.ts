import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketRatesController } from './market-rates.controller';
import { MarketRatesService } from './market-rates.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { FxRatesModule } from '../fx-rates';

@Module({
  imports: [ConfigModule, PrismaModule, FxRatesModule],
  controllers: [MarketRatesController],
  providers: [MarketRatesService],
  exports: [MarketRatesService],
})
export class MarketRatesModule {}
