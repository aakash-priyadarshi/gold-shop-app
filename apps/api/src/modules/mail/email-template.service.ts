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

  private async ensureDefaultTemplates() {
    const existing = await this.templateModel.findUnique({ where: { key: 'manual_user_message' } });
    if (existing) return;

    const html = this.readStaticTemplate('support-message');
    const templateData = {
      key: 'manual_user_message',
      name: 'Manual support message',
      description: 'Customer-safe message sent manually by admins from CRM, user detail, and email reply views.',
      audience: 'customer',
      trigger: 'POST /admin/messages/send',
      subject: '{{title}}',
      html,
      text: '{{message}}',
      senderName: 'Orivraa Support',
      senderEmail: EMAIL_SENDERS.SUPPORT,
      replyTo: EMAIL_SENDERS.SUPPORT,
      variables: ['title', 'recipientName', 'message', 'sentAt', 'appName', 'appUrl', 'supportEmail', 'year'],
      isActive: true,
      isSystem: true,
    };

    await this.prisma.$transaction(async (tx: any) => {
      const template = await tx.emailTemplate.create({ data: templateData });
      await tx.emailTemplateVersion.create({ data: this.versionPayload(template, 1) });
    });
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