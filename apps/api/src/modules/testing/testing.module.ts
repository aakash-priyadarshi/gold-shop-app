import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { TestingController } from "./testing.controller";
import { TestingService } from "./testing.service";

@Module({
  controllers: [TestingController],
  providers: [TestingService, PrismaService],
})
export class TestingModule {}
