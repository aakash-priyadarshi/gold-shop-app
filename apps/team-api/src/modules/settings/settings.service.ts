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
    return settings;
  }

  async updateSettings(data: {
    companyName?: string;
    timezone?: string;
    workingDaysPerWeek?: number;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    slaResponseMinutes?: number;
    slaResolutionMinutes?: number;
    elevenLabsApiKey?: string;
    mainApiUrl?: string;
    googleMeetBotEmail?: string;
    googleMeetBotPassword?: string;
    resendApiKey?: string;
    aiSalesFromEmail?: string;
  }) {
    const settings = await this.getSettings();
    return this.prisma.teamSettings.update({
      where: { id: settings.id },
      data,
    });
  }
}
