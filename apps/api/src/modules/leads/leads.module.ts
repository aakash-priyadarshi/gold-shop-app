import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { RecoveryOffersModule } from "../recovery-offers/recovery-offers.module";
import { LeadsController } from "./leads.controller";
import { LeadsOutreachService } from "./leads-outreach.service";
import { LeadsService } from "./leads.service";
import { LeadsWhatsAppService } from "./leads-whatsapp.service";
import { LeadsAiBotService } from "./leads-ai-bot.service";

@Module({
  imports: [PrismaModule, MailModule, RecoveryOffersModule],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    LeadsOutreachService,
    LeadsWhatsAppService,
    LeadsAiBotService,
  ],
  exports: [
    LeadsService,
    LeadsOutreachService,
    LeadsWhatsAppService,
    LeadsAiBotService,
  ],
})
export class LeadsModule {}
