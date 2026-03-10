import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AIAgentService } from "./ai-agent.service";
import { AIAgentController } from "./ai-agent.controller";

@Module({
  imports: [PrismaModule],
  providers: [AIAgentService],
  controllers: [AIAgentController],
  exports: [AIAgentService],
})
export class AIAgentModule {}
