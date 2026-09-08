import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { SupportAccessInterceptor } from "./support-access.interceptor";
import { SupportAccessController } from "./support-access.controller";
import { SupportAccessService } from "./support-access.service";
import { SupportAccessGuard } from "./support-access.guard";
import { ChatModule } from "../chat/chat.module";

@Module({
  imports: [ChatModule],
  controllers: [SupportAccessController],
  providers: [
    SupportAccessService,
    { provide: APP_GUARD, useClass: SupportAccessGuard },
    { provide: APP_INTERCEPTOR, useClass: SupportAccessInterceptor },
  ],
})
export class SupportAccessModule {}
