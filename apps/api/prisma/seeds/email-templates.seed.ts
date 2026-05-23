/**
 * Seed all system email templates into the EmailTemplate table.
 * Run with:  cd apps/api && node_modules\.bin\ts-node prisma/seeds/email-templates.seed.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const EMAIL_SENDERS = {
  NO_REPLY: 'noreply@orivraa.com',
  ORDERS: 'orders@orivraa.com',
  ADMIN: 'admin@orivraa.com',
  SUPPORT: 'support@orivraa.com',
} as const;

type SenderEmail = (typeof EMAIL_SENDERS)[keyof typeof EMAIL_SENDERS];

const TEMPLATES_DIR = path.join(__dirname, '../../src/modules/mail/templates');

function readHbs(name: string): string {
  return fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.hbs`), 'utf-8');
}

function extractVariables(...sources: Array<string | null | undefined>): string[] {
  const helpers = new Set([
    'formatDate', 'formatDateTime', 'formatCurrency', 'eq', 'uppercase', 'lowercase',
  ]);
  const variables = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    for (const match of source.matchAll(/{{\s*([^{}]+?)\s*}}/g)) {
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

interface TemplateDef {
  key: string;
  name: string;
  description: string;
  audience: string;
  trigger: string;
  subject: string;
  hbs: string;
  text: string;
  senderName: string;
  senderEmail: SenderEmail;
  replyTo: SenderEmail | null;
}

const definitions: TemplateDef[] = [
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
    text: 'Hi {{shopOwnerName}}, a new order #{{orderNumber}} from {{customerName}} has been placed. View it: {{dashboardUrl}}.',
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

async function main() {
  console.log('Checking existing email templates…');
  const existing = await (prisma as any).emailTemplate.findMany({ select: { key: true } });
  const existingKeys = new Set<string>(existing.map((t: any) => t.key));
  console.log('Already in DB:', existingKeys.size ? [...existingKeys].join(', ') : '(none)');

  let created = 0;
  let skipped = 0;

  for (const def of definitions) {
    if (existingKeys.has(def.key)) {
      console.log(`  skip (exists): ${def.key}`);
      skipped++;
      continue;
    }

    const { hbs, text, ...rest } = def;
    const html = readHbs(hbs);
    const variables = extractVariables(rest.subject, html, text);

    await prisma.$transaction(async (tx: any) => {
      const template = await tx.emailTemplate.create({
        data: { ...rest, html, text, variables, isActive: true, isSystem: true },
      });
      await tx.emailTemplateVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          subject: template.subject,
          html: template.html,
          text: template.text,
          senderName: template.senderName,
          senderEmail: template.senderEmail,
          replyTo: template.replyTo,
          variables: template.variables,
        },
      });
    });

    console.log(`  created: ${def.key}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}  Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
