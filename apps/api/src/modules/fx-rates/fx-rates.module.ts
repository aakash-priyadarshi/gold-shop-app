/**
 * FX Rates Module
 * Provides foreign exchange rate services using Frankfurter API
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FxRatesService } from './fx-rates.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [FxRatesService],
  exports: [FxRatesService],
})
export class FxRatesModule {}
