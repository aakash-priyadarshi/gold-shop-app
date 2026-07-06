import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as crypto from 'crypto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Post('inbound-email')
  @ApiOperation({ summary: 'Receive inbound emails from Resend or Sendgrid' })
  @HttpCode(HttpStatus.OK)
  async handleInboundEmail(
    @Headers('x-webhook-signature') signature: string,
    @Body() body: any
  ) {
    // Verify webhook signature using HMAC-SHA256 if MAIL_WEBHOOK_SECRET is set
    const webhookSecret = this.configService.get<string>('MAIL_WEBHOOK_SECRET');
    if (webhookSecret) {
      if (!signature) {
        this.logger.warn('Inbound email webhook rejected: missing x-webhook-signature header');
        throw new UnauthorizedException('Missing webhook signature');
      }
      const rawBody = JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      if (signature !== expectedSignature) {
        this.logger.warn('Inbound email webhook rejected: invalid signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    } else {
      this.logger.warn(
        'MAIL_WEBHOOK_SECRET is not set — inbound email webhook signature verification is disabled (development mode)',
      );
    }

    this.logger.log('Received inbound email webhook');

    try {
      // Basic structure from Resend Inbound
      const from = body.from || '';
      const to = Array.isArray(body.to) ? body.to.join(', ') : body.to || '';
      const subject = body.subject || 'No Subject';
      const textBody = body.text || body.html || '';

      // Extract raw email address from "Name <email@domain.com>"
      const emailRegex = /<([^>]+)>/;
      const match = from.match(emailRegex);
      const fromAddress = match ? match[1] : from;

      // Try to find if this email belongs to any registered user
      const user = await this.prisma.user.findFirst({
        where: { email: { equals: fromAddress, mode: 'insensitive' } }
      });

      // Simple thread extraction if the subject has "Re: " or if there's an In-Reply-To header
      // In a real app we might pass ThreadID in the custom headers, or parse the References
      const threadId = body.headers?.['in-reply-to'] || null;

      await this.prisma.emailLog.create({
        data: {
          direction: 'INBOUND',
          fromAddress,
          toAddress: to,
          subject,
          body: textBody,
          userId: user?.id,
          threadId: typeof threadId === 'string' ? threadId : null
        }
      });

      this.logger.log(`Logged inbound email from ${fromAddress}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to process inbound email', error);
      return { success: false, error: 'Failed to process' };
    }
  }
}
