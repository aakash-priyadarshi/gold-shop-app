import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { MailModule } from "./modules/mail/mail.module";
import { EmployeeModule } from "./modules/employees/employee.module";
import { TaskModule } from "./modules/tasks/task.module";
import { AIAgentModule } from "./modules/ai-sales/ai-agent.module";
import { CertificateModule } from "./modules/certificates/certificate.module";
import { SocialModule } from "./modules/social/social.module";
import { ReviewTrackerModule } from "./modules/review-tracker/review-tracker.module";
import { SupportModule } from "./modules/support/support.module";
import { HealthModule } from "./modules/health/health.module";
import { SettingsModule } from "./modules/settings/settings.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    MailModule,
    AuthModule,
    EmployeeModule,
    TaskModule,
    AIAgentModule,
    CertificateModule,
    SocialModule,
    ReviewTrackerModule,
    SupportModule,
    HealthModule,
    SettingsModule,
  ],
})
export class AppModule {}
