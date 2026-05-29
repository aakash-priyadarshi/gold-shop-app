import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

export interface SmsSendResult {
  success: boolean;
  sid?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Thin Twilio SMS sender used for out-of-app notification delivery.
 *
 * Mirrors the credential handling already used by OtpService but is exposed
 * as an injectable so notification fan-out can reuse it without duplicating
 * the HTTP details at every call site.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    const accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID");
    const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN");
    const fromNumber = this.configService.get<string>("TWILIO_PHONE_NUMBER");
    const messagingServiceSid = this.configService.get<string>(
      "TWILIO_MESSAGING_SERVICE_SID",
    );
    return Boolean(
      accountSid && authToken && (fromNumber || messagingServiceSid),
    );
  }

  /**
   * Send a plain-text SMS. Never throws — returns a result object so callers
   * (e.g. notification fan-out) can record delivery status without aborting.
   */
  async send(to: string, body: string): Promise<SmsSendResult> {
    const accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID");
    const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN");
    const fromNumber = this.configService.get<string>("TWILIO_PHONE_NUMBER");
    const messagingServiceSid = this.configService.get<string>(
      "TWILIO_MESSAGING_SERVICE_SID",
    );

    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
      this.logger.warn("Twilio SMS not configured; skipping SMS delivery");
      return { success: false, skipped: true, error: "SMS not configured" };
    }

    if (!to) {
      return { success: false, error: "Missing destination phone number" };
    }

    try {
      const payload = new URLSearchParams({ To: to, Body: body });
      if (messagingServiceSid) {
        payload.append("MessagingServiceSid", messagingServiceSid);
      } else if (fromNumber) {
        payload.append("From", fromNumber);
      }

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        payload,
        {
          auth: { username: accountSid, password: authToken },
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 15000,
        },
      );

      return { success: true, sid: response.data?.sid };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        "Unknown Twilio error";
      this.logger.error(`Failed to send notification SMS: ${message}`);
      return { success: false, error: message };
    }
  }
}
