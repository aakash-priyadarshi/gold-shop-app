/**
 * HTTP Client Module
 * Provides shared HTTP client with retry logic for all external API calls
 */

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpClientService } from './http-client.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [HttpClientService],
  exports: [HttpClientService],
})
export class HttpClientModule {}
