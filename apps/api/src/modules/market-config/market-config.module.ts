import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketConfigController } from './market-config.controller';
import { MarketConfigService } from './market-config.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [MarketConfigController],
  providers: [MarketConfigService],
  exports: [MarketConfigService],
})
export class MarketConfigModule {}
