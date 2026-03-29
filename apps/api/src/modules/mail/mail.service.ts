import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import { Resend } from 'resend';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Sender identities
export const EMAIL_SENDERS = {
  NO_REPLY: 'noreply@orivraa.com',
  ORDERS: 'orders@orivraa.com',
  ADMIN: 'admin@orivraa.com',
  SUPPORT: 'support@orivraa.com',
} as const;

type EmailProvider = 'resend' | 'smtp' | 'none';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private provider: EmailProvider = 'none';
  private templateCache: Map<string, handlebars.TemplateDelegate> = new Map();
  private readonly templatesDir: string;

  constructor(private readonly configService: ConfigService) {
    this.templatesDir = path.join(__dirname, 'templates');
    this.initEmailProvider();
    this.registerHandlebarsHelpers();
  }

  private initEmailProvider() {
    // Priority 1: Resend API (recommended for Railway)
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.provider = 'resend';
      this.logger.log('✅ Email provider: Resend API');
      return;
    }

    // Priority 2: SMTP (fallback)
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 465);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.initSmtpTransporter(host, port, user, pass);
      return;
    }

    this.logger.warn('⚠️ No email provider configured. Email sending disabled.');
    this.logger.warn('Set RESEND_API_KEY (recommended) or SMTP_* variables.');
  }

  private initSmtpTransporter(host: string, port: number, user: string, pass: string) {
    this.logger.log(`Initializing SMTP: ${host}:${port} (user: ${user})`);

    // Hostinger SMTP works best with port 465 (SSL) or 587 (STARTTLS)
    const useSSL = port === 465;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: useSSL, // true for 465, false for 587
      auth: { user, pass },
      tls: {
        // Allow self-signed certificates (some SMTP servers need this)
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      // Connection settings
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000,
      socketTimeout: 60000,
      // Pool settings for better reliability
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      rateDelta: 1000,
      rateLimit: 5,
    });

    this.provider = 'smtp';

    // Verify connection asynchronously
    this.verifySmtpConnection();
  }

  private async verifySmtpConnection() {
    if (!this.transporter) return;

    try {
      await this.transporter.verify();
      this.logger.log('✅ SMTP connection established successfully');
    } catch (err: any) {
      this.logger.error(`❌ SMTP connection failed: ${err.message}`);
      this.logger.error(`SMTP Config: ${this.configService.get('SMTP_HOST')}:${this.configService.get('SMTP_PORT')}`);
      this.logger.warn('⚠️ Falling back to disabled email. Consider using RESEND_API_KEY instead.');
      // Don't throw - allow app to start, emails will fail gracefully
    }
  }

  private registerHandlebarsHelpers() {
    // Format currency
    handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'NPR') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(amount);
    });

    // Format date
    handlebars.registerHelper('formatDate', (date: Date | string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Format date with time
    handlebars.registerHelper('formatDateTime', (date: Date | string) => {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    // Equals helper
    handlebars.registerHelper('eq', (a: any, b: any) => a === b);

    // Uppercase
    handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase());

    // Lowercase
    handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase());
  }

  private async loadTemplate(templateName: string): Promise<handlebars.TemplateDelegate> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    
    try {
      const templateSource = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(templateSource);
      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      this.logger.error(`Failed to load template: ${templateName}`);
      this.logger.error(`Template path: ${templatePath}`);
      throw new Error(`Email template not found: ${templateName}`);
    }
  }

  async send(options: EmailOptions): Promise<SendResult> {
    if (this.provider === 'none') {
      this.logger.warn('Email sending skipped - no email provider configured');
      return { success: false, error: 'No email provider configured' };
    }

    try {
      // Load and compile template
      const template = await this.loadTemplate(options.template);
      const html = template({
        ...options.context,
        year: new Date().getFullYear(),
        appName: 'Orivraa',
        appUrl: this.configService.get<string>('APP_URL', 'https://www.orivraa.com'),
        supportEmail: EMAIL_SENDERS.SUPPORT,
      });

      // Determine sender
      const from = options.from || `Orivraa <${EMAIL_SENDERS.NO_REPLY}>`;
      const to = Array.isArray(options.to) ? options.to : [options.to];

      // Use Resend if available
      if (this.provider === 'resend' && this.resend) {
        return this.sendWithResend(from, to, options.subject, html, options.replyTo);
      }

      // Fallback to SMTP
      if (this.provider === 'smtp' && this.transporter) {
        return this.sendWithSmtp(from, to, options.subject, html, options.replyTo, options.attachments);
      }

      return { success: false, error: 'No email provider available' };
    } catch (error: any) {
      this.logger.error(`❌ Failed to send email to ${options.to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  private async sendWithResend(
    from: string,
    to: string[],
    subject: string,
    html: string,
    replyTo?: string,
  ): Promise<SendResult> {
    try {
      const { data, error } = await this.resend!.emails.send({
        from,
        to,
        subject,
        html,
        replyTo,
      });

      if (error) {
        this.logger.error(`❌ Resend error: ${error.message}`);
        return { success: false, error: error.message };
      }

      this.logger.log(`✅ Email sent via Resend: ${data?.id} to ${to.join(', ')}`);
      return { success: true, messageId: data?.id };
    } catch (err: any) {
      this.logger.error(`❌ Resend exception: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  private async sendWithSmtp(
    from: string,
    to: string[],
    subject: string,
    html: string,
    replyTo?: string,
    attachments?: EmailOptions['attachments'],
  ): Promise<SendResult> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const info = await this.transporter!.sendMail({
          from,
          to: to.join(', '),
          subject,
          html,
          replyTo,
          attachments,
        });

        this.logger.log(`✅ Email sent via SMTP: ${info.messageId} to ${to.join(', ')}`);
        return { success: true, messageId: info.messageId };
      } catch (sendError: any) {
        lastError = sendError;
        this.logger.warn(`SMTP attempt ${attempt}/${maxRetries} failed: ${sendError.message}`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
      }
    }

    this.logger.error(`❌ SMTP failed after ${maxRetries} attempts`);
    return { success: false, error: lastError?.message || 'SMTP send failed' };
  }

  // Helper method to check if email is configured
  isConfigured(): boolean {
    return this.provider !== 'none';
  }

  // Get current provider info
  getProviderInfo(): { provider: EmailProvider; configured: boolean; sender: string } {
    return {
      provider: this.provider,
      configured: this.provider !== 'none',
      sender: EMAIL_SENDERS.NO_REPLY,
    };
  }

  // ==================== AUTH EMAILS ====================

  async sendOtp(to: string, otp: string, name: string): Promise<SendResult> {
    return this.send({
      to,
      subject: 'Your Orivraa Verification Code',
      template: 'otp',
      context: { otp, name, expiresIn: '10 minutes' },
    });
  }

  async sendWelcome(to: string, name: string): Promise<SendResult> {
    return this.send({
      to,
      subject: 'Welcome to Orivraa!',
      template: 'welcome',
      context: { name },
    });
  }

  async sendShopkeeperWelcome(to: string, name: string): Promise<SendResult> {
    return this.send({
      to,
      subject: 'Welcome to Orivraa Seller Network!',
      template: 'welcome-shopkeeper',
      context: { name },
    });
  }

  async sendPasswordReset(to: string, name: string, resetLink: string): Promise<SendResult> {
    return this.send({
      to,
      subject: 'Reset Your Orivraa Password',
      template: 'password-reset',
      context: { name, resetLink, expiresIn: '1 hour' },
    });
  }

  async sendPasswordChanged(to: string, name: string): Promise<SendResult> {
    return this.send({
      to,
      subject: 'Your Password Has Been Changed',
      template: 'password-changed',
      context: { name },
    });
  }

  // ==================== ORDER EMAILS ====================

  async sendOrderConfirmation(to: string, data: {
    customerName: string;
    orderNumber: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    currency: string;
    shippingAddress: string;
    shopName: string;
  }): Promise<SendResult> {
    return this.send({
      to,
      subject: `Order Confirmed - #${data.orderNumber}`,
      template: 'order-confirmation',
      context: data,
      from: `Orivraa Orders <${EMAIL_SENDERS.ORDERS}>`,
    });
  }

  async sendOrderStatusUpdate(to: string, data: {
    customerName: string;
    orderNumber: string;
    status: string;
    statusMessage: string;
    trackingNumber?: string;
    trackingUrl?: string;
  }): Promise<SendResult> {
    return this.send({
      to,
      subject: `Order Update - #${data.orderNumber}`,
      template: 'order-status',
      context: data,
      from: `Orivraa Orders <${EMAIL_SENDERS.ORDERS}>`,
    });
  }

  async sendOrderShipped(to: string, data: {
    customerName: string;
    orderNumber: string;
    trackingNumber: string;
    trackingUrl: string;
    carrier: string;
    estimatedDelivery: string;
  }): Promise<SendResult> {
    return this.send({
      to,
      subject: `Your Order Has Shipped - #${data.orderNumber}`,
      template: 'order-shipped',
      context: data,
      from: `Orivraa Orders <${EMAIL_SENDERS.ORDERS}>`,
    });
  }

  async sendOrderDelivered(to: string, data: {
    customerName: string;
    orderNumber: string;
    shopName: string;
  }): Promise<SendResult> {
    return this.send({
      to,
      subject: `Order Delivered - #${data.orderNumber}`,
      template: 'order-delivered',
      context: data,
      from: `Orivraa Orders <${EMAIL_SENDERS.ORDERS}>`,
    });
  }

  // ==================== SELLER EMAILS ====================

  async sendNewOrderNotification(to: string, data: {
    shopOwnerName: string;
    orderNumber: string;
    customerName: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    currency: string;
    dashboardUrl: string;
  }): Promise<SendResult> {
    return this.send({
      to,
      subject: `🎉 New Order Received - #${data.orderNumber}`,
      template: 'seller-new-order',
      context: data,
      from: `Orivraa Orders <${EMAIL_SENDERS.ORDERS}>`,
    });
  }

  async sendNewRfqNotification(to: string, data: {
    shopOwnerName: string;
    rfqNumber: string;
    customerName: string;
    itemDescription: string;
    material: string;
    weight: string;
    dashboardUrl: string;
  }): Promise<SendResult> {
    return this.send({
      to,
      subject: `New Quote Request - ${data.rfqNumber}`,
      template: 'seller-new-rfq',
      context: data,
      from: `Orivraa <${EMAIL_SENDERS.NO_REPLY}>`,
    });
  }

  // ==================== ADMIN EMAILS ====================

  async sendCommissionReminder(to: string, data: {
    shopOwnerName: string;
    shopName: string;
    pendingAmount: number;
    currency: string;
    dueDate: string;
    paymentUrl: string;
  }): Promise<SendResult> {
    return this.send({
      to,
      subject: `Commission Payment Reminder - ${data.shopName}`,
      template: 'commission-reminder',
      context: data,
      from: `Orivraa Admin <${EMAIL_SENDERS.ADMIN}>`,
    });
  }

  async sendShopVerificationStatus(to: string, data: {
    shopOwnerName: string;
    shopName: string;
    status: 'approved' | 'rejected';
    reason?: string;
    dashboardUrl: string;
  }): Promise<SendResult> {
    const statusText = data.status === 'approved' ? 'Approved' : 'Requires Changes';
    return this.send({
      to,
      subject: `Shop Verification ${statusText} - ${data.shopName}`,
      template: 'shop-verification',
      context: data,
      from: `Orivraa Admin <${EMAIL_SENDERS.ADMIN}>`,
    });
  }

  async sendAdminAlert(to: string | string[], data: {
    alertType: string;
    title: string;
    message: string;
    details?: Record<string, string>;
    actionUrl?: string;
    actionText?: string;
  }): Promise<SendResult> {
    return this.send({
      to,
      subject: `[Alert] ${data.title}`,
      template: 'admin-alert',
      context: data,
      from: `Orivraa System <${EMAIL_SENDERS.ADMIN}>`,
    });
  }

  // ==================== QUOTE EMAILS ====================

  async sendQuoteReceived(to: string, data: {
    customerName: string;
    rfqNumber: string;
    shopName: string;
    quotedPrice: number;
    currency: string;
    validUntil: string;
    viewUrl: string;
  }): Promise<SendResult> {
    return this.send({
      to,
      subject: `Quote Received from ${data.shopName}`,
      template: 'quote-received',
      context: data,
    });
  }

  async sendQuoteAccepted(to: string, data: {
    shopOwnerName: string;
    rfqNumber: string;
    customerName: string;
    quotedPrice: number;
    currency: string;
  }): Promise<SendResult> {
    return this.send({
      to,
      subject: `✅ Quote Accepted - ${data.rfqNumber}`,
      template: 'quote-accepted',
      context: data,
      from: `Orivraa Orders <${EMAIL_SENDERS.ORDERS}>`,
    });
  }

  async sendContactForm(data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    interest?: string;
    message: string;
    source?: string;
  }): Promise<SendResult> {
    return this.send({
      to: 'sales@orivraa.com',
      subject: `💬 New Inquiry from ${data.name}${data.interest ? ` — ${data.interest}` : ''}`,
      template: 'contact-form',
      context: { ...data, source: data.source || 'Website' },
      from: `Orivraa <${EMAIL_SENDERS.NO_REPLY}>`,
      replyTo: data.email,
    });
  }
}
