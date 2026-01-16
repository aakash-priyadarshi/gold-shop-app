import { Module } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { AuditModule } from '../audit/audit.module';
import { RedisModule } from '../../common';

@Module({
  imports: [AuditModule, RedisModule],
  controllers: [ShopsController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
