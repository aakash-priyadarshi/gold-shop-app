import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log("Resend email service initialized");
    } else {
      this.logger.warn("RESEND_API_KEY not set — emails will be logged only");
    }
    this.fromEmail = this.config.get<string>("MAIL_FROM") || "noreply@orivraa.com";
  }

  async sendWelcomeEmail(to: string, name: string, employeeCode: string, role: string) {
    const subject = `Welcome to Orivraa Team — ${name}`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fafafa;">
        <div style="background: linear-gradient(135deg, #d4a843, #b8941f); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">Welcome to Orivraa</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Team Operations Portal</p>
        </div>
        <div style="background: #fff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${name}! 👋</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            You have been added to the Orivraa team. Here are your details:
          </p>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280; width: 40%;">Employee Code</td><td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${employeeCode}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Role</td><td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${role}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${to}</td></tr>
            </table>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            You can access the team portal at <a href="https://team.orivraa.com" style="color: #d4a843; text-decoration: none; font-weight: 600;">team.orivraa.com</a>.
            Please log in with your credentials to get started.
          </p>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            This is an automated message from Orivraa Team Operations. Please do not reply.
          </p>
        </div>
      </div>
    `;

    return this.send(to, subject, html);
  }

  async sendLeaveStatusEmail(to: string, name: string, status: string, leaveType: string, startDate: string, endDate: string) {
    const approved = status === "APPROVED";
    const subject = `Leave ${status} — ${leaveType}`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: ${approved ? "#059669" : "#dc2626"}; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Leave ${status}</h1>
        </div>
        <div style="background: #fff; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
          <p style="color: #4b5563;">Hi ${name},</p>
          <p style="color: #4b5563;">Your <strong>${leaveType}</strong> leave request from <strong>${startDate}</strong> to <strong>${endDate}</strong> has been <strong>${status.toLowerCase()}</strong>.</p>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">— Orivraa Team Operations</p>
        </div>
      </div>
    `;

    return this.send(to, subject, html);
  }

  async sendTerminationEmail(to: string, name: string, reason?: string) {
    const subject = `Account Deactivated — Orivraa Team`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #dc2626; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Account Deactivated</h1>
        </div>
        <div style="background: #fff; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
          <p style="color: #4b5563;">Hi ${name},</p>
          <p style="color: #4b5563;">Your Orivraa team account has been deactivated.${reason ? ` Reason: ${reason}` : ""}</p>
          <p style="color: #4b5563;">If you believe this is an error, please contact your administrator.</p>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">— Orivraa Team Operations</p>
        </div>
      </div>
    `;

    return this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.resend) {
      this.logger.log(`[DRY-RUN] Email to=${to} subject="${subject}"`);
      return false;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: "${subject}"`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }
}
