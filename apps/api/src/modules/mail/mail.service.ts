import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

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

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private templateCache: Map<string, handlebars.TemplateDelegate> = new Map();
  private readonly templatesDir: string;

  constructor(private readonly configService: ConfigService) {
    this.templatesDir = path.join(__dirname, 'templates');
    this.initTransporter();
    this.registerHandlebarsHelpers();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP configuration incomplete. Email sending will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: true,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    // Verify connection
    this.transporter.verify()
      .then(() => this.logger.log('SMTP connection established'))
      .catch((err: Error) => this.logger.error('SMTP connection failed:', err.message));
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
      this.logger.error(`Failed to load template: ${templateName}`, error);
      throw new Error(`Email template not found: ${templateName}`);
    }
  }

  async send(options: EmailOptions): Promise<SendResult> {
    if (!this.transporter) {
      this.logger.warn('Email sending skipped - SMTP not configured');
      return { success: false, error: 'SMTP not configured' };
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

      // Send email
      const info = await this.transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
        replyTo: options.replyTo,
        attachments: options.attachments,
      });

      this.logger.log(`Email sent: ${info.messageId} to ${options.to}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${options.to}:`, error.message);
      return { success: false, error: error.message };
    }
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
}
