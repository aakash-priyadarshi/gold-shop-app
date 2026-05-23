import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { EMAIL_SENDERS, MailService } from './mail.service';

type EmailTemplateInput = {
  key?: string;
  name?: string;
  description?: string | null;
  audience?: string;
  trigger?: string | null;
  subject?: string;
  html?: string;
  text?: string | null;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string | null;
  variables?: string[] | string;
  isActive?: boolean;
  isSystem?: boolean;
};

@Injectable()
export class EmailTemplateService {
  private readonly templatesDir = path.join(__dirname, 'templates');
  private readonly allowedSenderEmails = new Set(Object.values(EMAIL_SENDERS));

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private get templateModel() {
    return (this.prisma as any).emailTemplate;
  }

  private get versionModel() {
    return (this.prisma as any).emailTemplateVersion;
  }

  private readStaticTemplate(templateName: string) {
    return fs.readFileSync(path.join(this.templatesDir, `${templateName}.hbs`), 'utf-8');
  }

  private isAdminAudience(audience?: string | null) {
    const normalized = (audience || '').toLowerCase();
    return normalized.includes('admin') || normalized.includes('internal');
  }

  private normalizeVariables(value: EmailTemplateInput['variables'], subject = '', html = '', text = '') {
    if (Array.isArray(value)) {
      return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
    }

    if (typeof value === 'string' && value.trim()) {
      return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
    }

    return this.extractVariables(subject, html, text);
  }

  private extractVariables(...sources: Array<string | null | undefined>) {
    const helpers = new Set(['formatDate', 'formatDateTime', 'formatCurrency', 'eq', 'uppercase', 'lowercase']);
    const variables = new Set<string>();

    for (const source of sources) {
      if (!source) continue;
      const matches = source.matchAll(/{{\s*([^{}]+?)\s*}}/g);
      for (const match of matches) {
        const expression = match[1].trim();
        if (!expression || expression.startsWith('!') || expression.startsWith('>') || expression.startsWith('/')) continue;
        const parts = expression.replace(/^#/, '').split(/\s+/).filter(Boolean);
        const variable = helpers.has(parts[0]) ? parts[1] : parts[0];
        if (variable && /^[A-Za-z0-9_.]+$/.test(variable) && variable !== 'else') {
          variables.add(variable);
        }
      }
    }

    return [...variables];
  }

  private normalizeInput(data: EmailTemplateInput, current?: any) {
    const key = (data.key ?? current?.key ?? '').trim();
    const name = (data.name ?? current?.name ?? '').trim();
    const audience = (data.audience ?? current?.audience ?? '').trim();
    const subject = data.subject ?? current?.subject ?? '';
    const html = data.html ?? current?.html ?? '';
    const text = data.text === undefined ? current?.text ?? null : data.text || null;
    const senderName = (data.senderName ?? current?.senderName ?? 'Orivraa').trim();
    const senderEmail = (data.senderEmail ?? current?.senderEmail ?? EMAIL_SENDERS.SUPPORT).trim().toLowerCase();
    const replyTo = data.replyTo === undefined ? current?.replyTo ?? null : data.replyTo || null;
    const variables = this.normalizeVariables(data.variables ?? current?.variables, subject, html, text ?? '');

    if (!key) throw new BadRequestException('Template key is required');
    if (!/^[a-z0-9_:-]+$/.test(key)) {
      throw new BadRequestException('Template key can only contain lowercase letters, numbers, underscores, colons, and hyphens');
    }
    if (!name) throw new BadRequestException('Template name is required');
    if (!audience) throw new BadRequestException('Template audience is required');
    if (!subject.trim()) throw new BadRequestException('Template subject is required');
    if (!html.trim()) throw new BadRequestException('Template HTML is required');
    if (!this.allowedSenderEmails.has(senderEmail as any)) {
      throw new BadRequestException(`Sender must be one of: ${[...this.allowedSenderEmails].join(', ')}`);
    }
    if (!this.isAdminAudience(audience) && html.includes('/dashboard/admin')) {
      throw new BadRequestException('Customer-facing templates cannot contain admin dashboard links');
    }

    return {
      key,
      name,
      description: data.description === undefined ? current?.description ?? null : data.description || null,
      audience,
      trigger: data.trigger === undefined ? current?.trigger ?? null : data.trigger || null,
      subject,
      html,
      text,
      senderName,
      senderEmail,
      replyTo,
      variables,
      isActive: data.isActive ?? current?.isActive ?? true,
      isSystem: data.isSystem ?? current?.isSystem ?? false,
    };
  }

  private versionPayload(template: any, version: number, adminId?: string) {
    return {
      templateId: template.id,
      version,
      subject: template.subject,
      html: template.html,
      text: template.text,
      senderName: template.senderName,
      senderEmail: template.senderEmail,
      replyTo: template.replyTo,
      variables: template.variables,
      createdBy: adminId,
    };
  }

  private fromAddress(template: any) {
    return `${template.senderName} <${template.senderEmail}>`;
  }

  private getSystemTemplateDefinitions(): Array<{
    key: string;
    name: string;
    description: string;
    audience: string;
    trigger: string;
    subject: string;
    hbs: string;
    text: string;
    senderName: string;
    senderEmail: string;
    replyTo: string | null;
  }> {
    return [
      {
        key: 'manual_user_message',
        name: 'Manual support message',
        description: 'Customer-safe message sent manually by admins from CRM, user detail, and email reply views.',
        audience: 'customer',
        trigger: 'POST /admin/messages/send',
        subject: '{{title}}',
        hbs: 'support-message',
        text: '{{message}}',
        senderName: 'Orivraa Support',
        senderEmail: EMAIL_SENDERS.SUPPORT,
        replyTo: EMAIL_SENDERS.SUPPORT,
      },
      {
        key: 'email_verification_otp',
        name: 'Email verification code',
        description: 'OTP sent to users who verify or re-verify their email address.',
        audience: 'customer',
        trigger: 'OtpService.sendEmailOtp',
        subject: 'Your {{appName}} verification code',
        hbs: 'otp',
        text: 'Hi {{name}}, your verification code is {{otp}}. It expires in {{expiresIn}}. Never share this code with anyone.',
        senderName: 'Orivraa',
        senderEmail: EMAIL_SENDERS.NO_REPLY,
        replyTo: null,
      },
      {
        key: 'password_reset_otp',
        name: 'Password reset code',
        description: 'OTP sent to users who requested a password reset.',
        audience: 'customer',
        trigger: 'OtpService.sendEmailOtp (password reset flow)',
        subject: 'Reset your {{appName}} password',
        hbs: 'password-reset-otp',
        text: 'Hi {{name}}, your password reset code is {{otp}}. It expires in {{expiresIn}}. If you did not request this, ignore this email.',
        senderName: 'Orivraa',
        senderEmail: EMAIL_SENDERS.NO_REPLY,
        replyTo: null,
      },
      {
        key: 'customer_welcome',
        name: 'Customer welcome',
        description: 'Sent to new customers after registration or first OAuth sign-in.',
        audience: 'customer',
        trigger: 'AuthService.sendWelcome',
        subject: 'Welcome to {{appName}}! 🎉',
        hbs: 'welcome',
        text: 'Hi {{name}}, welcome to {{appName}}! Start exploring verified jewellers and live gold prices at {{appUrl}}.',
        senderName: 'Orivraa',
        senderEmail: EMAIL_SENDERS.NO_REPLY,
        replyTo: null,
      },
      {
        key: 'shopkeeper_welcome',
        name: 'Shopkeeper welcome',
        description: 'Sent to new sellers after registration or first OAuth sign-in.',
        audience: 'seller',
        trigger: 'AuthService.sendShopkeeperWelcome',
        subject: 'Welcome to {{appName}} – Your seller account is ready',
        hbs: 'welcome-shopkeeper',
        text: 'Hi {{name}}, your seller account on {{appName}} is ready. Set up your shop at {{appUrl}}.',
        senderName: 'Orivraa',
        senderEmail: EMAIL_SENDERS.NO_REPLY,
        replyTo: null,
      },
      {
        key: 'order_confirmation',
        name: 'Order confirmation',
        description: 'Sent to customers when their order is successfully placed.',
        audience: 'customer',
        trigger: 'OrdersService.createOrder',
        subject: 'Order confirmed – #{{orderNumber}}',
        hbs: 'order-confirmation',
        text: 'Hi {{customerName}}, your order #{{orderNumber}} from {{shopName}} has been confirmed. Total: {{currency}} {{total}}.',
        senderName: 'Orivraa Orders',
        senderEmail: EMAIL_SENDERS.ORDERS,
        replyTo: null,
      },
      {
        key: 'order_status_update',
        name: 'Order status update',
        description: 'General order status update email sent when an order changes state.',
        audience: 'customer',
        trigger: 'MailService order status helpers',
        subject: 'Order #{{orderNumber}} status update',
        hbs: 'order-status',
        text: 'Hi {{customerName}}, your order #{{orderNumber}} status is now: {{status}}.',
        senderName: 'Orivraa Orders',
        senderEmail: EMAIL_SENDERS.ORDERS,
        replyTo: null,
      },
      {
        key: 'order_shipped',
        name: 'Order shipped',
        description: 'Sent to customers when their order has been dispatched with tracking details.',
        audience: 'customer',
        trigger: 'MailService.sendOrderShipped',
        subject: 'Your order #{{orderNumber}} has been shipped! 📦',
        hbs: 'order-shipped',
        text: 'Hi {{customerName}}, your order #{{orderNumber}} has been shipped via {{carrier}}. Tracking: {{trackingNumber}}. Track here: {{trackingUrl}}.',
        senderName: 'Orivraa Orders',
        senderEmail: EMAIL_SENDERS.ORDERS,
        replyTo: null,
      },
      {
        key: 'order_delivered',
        name: 'Order delivered',
        description: 'Sent to customers to confirm their order has been delivered.',
        audience: 'customer',
        trigger: 'MailService.sendOrderDelivered',
        subject: 'Your order #{{orderNumber}} has been delivered! ✅',
        hbs: 'order-delivered',
        text: 'Hi {{customerName}}, your order #{{orderNumber}} from {{shopName}} has been delivered. We hope you love it!',
        senderName: 'Orivraa Orders',
        senderEmail: EMAIL_SENDERS.ORDERS,
        replyTo: null,
      },
      {
        key: 'seller_new_order',
        name: 'Seller new order notification',
        description: 'Sent to shop owners when a new order is placed in their shop.',
        audience: 'seller',
        trigger: 'OrdersService.createOrder',
        subject: 'New order received – #{{orderNumber}}',
        hbs: 'seller-new-order',
        text: 'Hi {{shopOwnerName}}, a new order #{{orderNumber}} from {{customerName}} has been placed. View it in your dashboard: {{dashboardUrl}}.',
        senderName: 'Orivraa Orders',
        senderEmail: EMAIL_SENDERS.ORDERS,
        replyTo: null,
      },
      {
        key: 'seller_new_rfq',
        name: 'Seller new RFQ notification',
        description: 'Sent to shop owners when a new quote request (RFQ) is submitted for their shop.',
        audience: 'seller',
        trigger: 'MailService.sendNewRfqNotification',
        subject: 'New quote request – {{rfqNumber}}',
        hbs: 'seller-new-rfq',
        text: 'Hi {{shopOwnerName}}, {{customerName}} submitted a quote request for {{itemDescription}}. View it: {{dashboardUrl}}.',
        senderName: 'Orivraa',
        senderEmail: EMAIL_SENDERS.NO_REPLY,
        replyTo: null,
      },
      {
        key: 'shop_quote_tracking_link',
        name: 'Shop quote tracking link',
        description: 'Sent to walk-in customers when the shop shares a tracking link for their quote.',
        audience: 'customer',
        trigger: 'ShopQuotesService.sendTrackingLink',
        subject: 'Your quote tracking link from {{shopName}}',
        hbs: 'tracking-link',
        text: 'Hi {{customerName}}, {{shopName}} has shared a tracking link for your quote #{{quoteNumber}}. Track it: {{trackingUrl}}.',
        senderName: 'Orivraa Orders',
        senderEmail: EMAIL_SENDERS.ORDERS,
        replyTo: null,
      },
      {
        key: 'shop_verification_status',
        name: 'Shop verification status',
        description: 'Sent to shop owners when admin approves or rejects their shop verification.',
        audience: 'seller',
        trigger: 'MailService.sendShopVerificationStatus',
        subject: 'Your shop verification status – {{shopName}}',
        hbs: 'shop-verification',
        text: 'Hi {{shopOwnerName}}, your shop {{shopName}} verification status is: {{status}}. Visit your dashboard: {{dashboardUrl}}.',
        senderName: 'Orivraa Admin',
        senderEmail: EMAIL_SENDERS.ADMIN,
        replyTo: null,
      },
      {
        key: 'commission_reminder',
        name: 'Commission payment reminder',
        description: 'Sent to shop owners as a reminder about pending commission payments.',
        audience: 'seller',
        trigger: 'MailService.sendCommissionReminder',
        subject: 'Commission payment due – {{shopName}}',
        hbs: 'commission-reminder',
        text: 'Hi {{shopOwnerName}}, you have a pending commission of {{currency}} {{pendingAmount}} due on {{dueDate}} for {{shopName}}. Pay here: {{paymentUrl}}.',
        senderName: 'Orivraa Admin',
        senderEmail: EMAIL_SENDERS.ADMIN,
        replyTo: null,
      },
      {
        key: 'system_admin_alert',
        name: 'Internal admin alert',
        description: 'Internal system alerts sent to admins from backup, AI description, or health monitoring services.',
        audience: 'admin',
        trigger: 'MailService.sendAdminAlert',
        subject: '[{{alertType}}] {{title}}',
        hbs: 'admin-alert',
        text: '{{title}}\n\n{{message}}\n\n{{details}}',
        senderName: 'Orivraa System',
        senderEmail: EMAIL_SENDERS.ADMIN,
        replyTo: null,
      },
      {
        key: 'contact_form',
        name: 'Website inquiry',
        description: 'Sent to the sales inbox when a visitor submits the contact form.',
        audience: 'admin',
        trigger: 'ContactController form submission',
        subject: 'New inquiry from {{name}} – {{interest}}',
        hbs: 'contact-form',
        text: 'New inquiry from {{name}} ({{email}}). Message: {{message}}',
        senderName: 'Orivraa',
        senderEmail: EMAIL_SENDERS.NO_REPLY,
        replyTo: null,
      },
    ];
  }

  private async ensureDefaultTemplates() {
    const existing = await this.templateModel.findMany({ select: { key: true } });
    const existingKeys = new Set(existing.map((t: any) => t.key));

    const definitions = this.getSystemTemplateDefinitions();

    for (const def of definitions) {
      if (existingKeys.has(def.key)) continue;

      const { hbs, text, ...rest } = def;
      const html = this.readStaticTemplate(hbs);
      const variables = this.extractVariables(rest.subject, html, text);

      const templateData = {
        ...rest,
        html,
        text,
        variables,
        isActive: true,
        isSystem: true,
      };

      await this.prisma.$transaction(async (tx: any) => {
        const template = await tx.emailTemplate.create({ data: templateData });
        await tx.emailTemplateVersion.create({ data: this.versionPayload(template, 1) });
      });
    }
  }

  async listTemplates() {
    await this.ensureDefaultTemplates();
    return this.templateModel.findMany({
      orderBy: [{ isSystem: 'desc' }, { key: 'asc' }],
    });
  }

  async getTemplate(id: string) {
    await this.ensureDefaultTemplates();
    const template = await this.templateModel.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' }, take: 10 } },
    });
    if (!template) throw new NotFoundException('Email template not found');
    return template;
  }

  async createTemplate(data: EmailTemplateInput, adminId?: string) {
    const normalized = this.normalizeInput(data);

    return this.prisma.$transaction(async (tx: any) => {
      const template = await tx.emailTemplate.create({
        data: { ...normalized, createdBy: adminId, updatedBy: adminId },
      });
      await tx.emailTemplateVersion.create({ data: this.versionPayload(template, 1, adminId) });
      return template;
    });
  }

  async updateTemplate(id: string, data: EmailTemplateInput, adminId?: string) {
    const current = await this.templateModel.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Email template not found');

    const normalized = this.normalizeInput(data, current);
    const latestVersion = await this.versionModel.findFirst({
      where: { templateId: id },
      orderBy: { version: 'desc' },
    });

    return this.prisma.$transaction(async (tx: any) => {
      const template = await tx.emailTemplate.update({
        where: { id },
        data: { ...normalized, updatedBy: adminId },
      });
      await tx.emailTemplateVersion.create({
        data: this.versionPayload(template, (latestVersion?.version || 0) + 1, adminId),
      });
      return template;
    });
  }

  async deleteTemplate(id: string) {
    const current = await this.templateModel.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Email template not found');
    if (current.isSystem) {
      throw new BadRequestException('Default email templates cannot be deleted. Edit them or mark them inactive instead.');
    }
    await this.templateModel.delete({ where: { id } });
    return { success: true };
  }

  renderRecord(template: any, context: Record<string, any> = {}) {
    const subject = this.mailService.renderTemplateString(template.subject, context);
    const html = this.mailService.renderTemplateString(template.html, context);
    const text = template.text ? this.mailService.renderTemplateString(template.text, context) : null;

    if (!this.isAdminAudience(template.audience) && html.includes('/dashboard/admin')) {
      throw new BadRequestException('Rendered customer-facing email contains an admin dashboard link');
    }

    return {
      key: template.key,
      subject,
      html,
      text,
      from: this.fromAddress(template),
      replyTo: template.replyTo,
      variables: template.variables,
    };
  }

  async previewTemplate(id: string, context: Record<string, any> = {}) {
    const template = await this.getTemplate(id);
    return this.renderRecord(template, this.withExampleContext(context));
  }

  async previewDraft(data: EmailTemplateInput & { context?: Record<string, any> }) {
    const normalized = this.normalizeInput(data);
    return this.renderRecord(normalized, this.withExampleContext(data.context || {}));
  }

  async renderByKey(key: string, context: Record<string, any>, fallback: {
    subject: string;
    templateName: string;
    senderName: string;
    senderEmail: string;
    replyTo?: string | null;
    audience: string;
  }) {
    await this.ensureDefaultTemplates();
    const template = await this.templateModel.findFirst({ where: { key, isActive: true } });
    if (template) {
      return this.renderRecord(template, context);
    }

    const fallbackTemplate = {
      key,
      subject: fallback.subject,
      html: this.readStaticTemplate(fallback.templateName),
      text: '{{message}}',
      senderName: fallback.senderName,
      senderEmail: fallback.senderEmail,
      replyTo: fallback.replyTo || null,
      audience: fallback.audience,
      variables: this.extractVariables(fallback.subject, this.readStaticTemplate(fallback.templateName), '{{message}}'),
    };

    return this.renderRecord(fallbackTemplate, context);
  }

  private withExampleContext(context: Record<string, any>) {
    return {
      title: 'Message from Orivraa Support',
      recipientName: 'Aakash',
      message: 'Thank you for contacting Orivraa. We are reviewing your request and will follow up soon.',
      sentAt: new Date(),
      orderNumber: 'ORD-1001',
      shopName: 'Demo Jewellers',
      customerName: 'Aakash',
      ...context,
    };
  }
}