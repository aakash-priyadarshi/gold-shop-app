import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CrashReport } from "@prisma/client";

export interface SlackDeliveryResult {
  delivered: boolean;
  reason?: "not_configured" | "invalid_url" | "delivery_failed";
}

@Injectable()
export class CrashReportAlertsService {
  private readonly logger = new Logger(CrashReportAlertsService.name);

  constructor(private readonly config: ConfigService) {}

  getSlackStatus() {
    const webhookUrl = this.webhookUrl();
    return {
      configured: this.isValidSlackWebhook(webhookUrl),
      requested: Boolean(webhookUrl),
      mentionEnabled: Boolean(this.mentionToken()),
    };
  }

  async sendCrashReportAlert(
    report: CrashReport,
  ): Promise<SlackDeliveryResult> {
    const source = report.userTriggered ? "User reported" : "Automatic";
    const role = report.userRole || "guest";
    const adminUrl = this.adminCrashReportsUrl();
    const mention = this.mentionToken();
    const error = this.escapeSlack(report.errorMessage, 1800);
    const page = this.escapeSlack(report.page, 500);
    const action = report.userAction
      ? this.escapeSlack(report.userAction, 500)
      : "Not provided";

    return this.deliver({
      text: `${mention ? `${mention} ` : ""}New Orivraa crash report: ${error}`,
      blocks: [
        ...(mention
          ? [
              {
                type: "section",
                text: { type: "mrkdwn", text: mention },
              },
            ]
          : []),
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 New Orivraa crash report",
            emoji: true,
          },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Error*\n${error}` },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Page*\n${page}` },
            {
              type: "mrkdwn",
              text: `*Platform*\n${this.escapeSlack(report.platform)}${
                report.appVersion
                  ? ` v${this.escapeSlack(report.appVersion)}`
                  : ""
              }`,
            },
            { type: "mrkdwn", text: `*Role*\n${this.escapeSlack(role)}` },
            { type: "mrkdwn", text: `*Source*\n${source}` },
          ],
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Last action*\n${action}` },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Report ID: \`${this.escapeSlack(report.id)}\` • ${report.createdAt.toISOString()}`,
            },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Open crash reports" },
              url: adminUrl,
              action_id: "open_crash_reports",
            },
          ],
        },
      ],
    });
  }

  async sendTestAlert(): Promise<SlackDeliveryResult> {
    const mention = this.mentionToken();
    return this.deliver({
      text: `${mention ? `${mention} ` : ""}Orivraa crash-report Slack alerts are connected.`,
      blocks: [
        ...(mention
          ? [
              {
                type: "section",
                text: { type: "mrkdwn", text: mention },
              },
            ]
          : []),
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "✅ Orivraa alerts connected",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "New crash reports will be posted in this channel with a link to the admin inbox.",
          },
        },
      ],
    });
  }

  private async deliver(
    payload: Record<string, unknown>,
  ): Promise<SlackDeliveryResult> {
    const webhookUrl = this.webhookUrl();
    if (!webhookUrl) return { delivered: false, reason: "not_configured" };
    if (!this.isValidSlackWebhook(webhookUrl)) {
      this.logger.error(
        "CRASH_REPORT_SLACK_WEBHOOK_URL is not a valid Slack Incoming Webhook URL",
      );
      return { delivered: false, reason: "invalid_url" };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        this.logger.error(
          `Slack crash alert failed with HTTP ${response.status}`,
        );
        return { delivered: false, reason: "delivery_failed" };
      }
      return { delivered: true };
    } catch (error) {
      this.logger.error(
        `Slack crash alert delivery failed: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      return { delivered: false, reason: "delivery_failed" };
    }
  }

  private webhookUrl(): string {
    return (
      this.config.get<string>("CRASH_REPORT_SLACK_WEBHOOK_URL")?.trim() || ""
    );
  }

  private mentionToken(): string {
    const mention = this.config
      .get<string>("CRASH_REPORT_SLACK_MENTION")
      ?.trim()
      .toLowerCase();
    if (mention === "here") return "<!here>";
    if (mention === "channel") return "<!channel>";
    if (/^[uw][a-z0-9]{8,}$/i.test(mention || "")) {
      return `<@${mention!.toUpperCase()}>`;
    }
    return "";
  }

  private isValidSlackWebhook(value: string): boolean {
    if (!value) return false;
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        (url.hostname === "hooks.slack.com" ||
          url.hostname === "hooks.slack-gov.com") &&
        url.pathname.startsWith("/services/")
      );
    } catch {
      return false;
    }
  }

  private adminCrashReportsUrl(): string {
    const frontendUrl =
      this.config.get<string>("FRONTEND_URL")?.replace(/\/$/, "") ||
      "https://www.orivraa.com";
    return `${frontendUrl}/dashboard/admin/crash-reports`;
  }

  private escapeSlack(value: string, maxLength = 1000): string {
    return String(value || "")
      .slice(0, maxLength)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
