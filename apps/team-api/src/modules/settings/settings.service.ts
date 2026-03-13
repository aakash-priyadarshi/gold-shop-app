import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.teamSettings.findUnique({
      where: { id: "singleton" },
    });
    if (!settings) {
      settings = await this.prisma.teamSettings.create({
        data: { id: "singleton" },
      });
    }
    // Return with frontend-friendly aliases, omit sensitive cached data
    const { googleMeetBotCookies, googleMeetBotPassword, ...safe } = settings as any;
    return {
      ...safe,
      workStartTime: settings.workingHoursStart,
      workEndTime: settings.workingHoursEnd,
      // Indicate password is set without exposing it
      googleMeetBotPasswordSet: !!googleMeetBotPassword,
    };
  }

  async updateSettings(data: {
    companyName?: string;
    timezone?: string;
    currency?: string;
    workingDaysPerWeek?: number;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    lateThresholdMinutes?: number;
    annualLeaveDays?: number;
    slaResponseMinutes?: number;
    slaResolutionMinutes?: number;
    elevenLabsApiKey?: string;
    mainApiUrl?: string;
    googleMeetBotEmail?: string;
    googleMeetBotPassword?: string;
    aiSalesFromEmail?: string;
    salesGreeting?: string;
    // Frontend field name aliases
    workStartTime?: string;
    workEndTime?: string;
  }) {
    const settings = await this.getSettings();

    // Map frontend field names to Prisma field names
    const mapped: Record<string, any> = { ...data };
    if (data.workStartTime !== undefined) {
      mapped.workingHoursStart = data.workStartTime;
      delete mapped.workStartTime;
    }
    if (data.workEndTime !== undefined) {
      mapped.workingHoursEnd = data.workEndTime;
      delete mapped.workEndTime;
    }
    // Remove fields not in schema
    delete mapped.id;
    delete mapped.updatedAt;
    delete mapped.createdAt;
    delete mapped.googleMeetBotPasswordSet;
    // Don't overwrite password with empty string — only update if explicitly set
    if (!mapped.googleMeetBotPassword) {
      delete mapped.googleMeetBotPassword;
    }
    // Invalidate cached cookies when email/password changes
    if (mapped.googleMeetBotEmail || mapped.googleMeetBotPassword) {
      mapped.googleMeetBotCookies = null;
    }

    return this.prisma.teamSettings.update({
      where: { id: settings.id },
      data: mapped,
    });
  }
}
