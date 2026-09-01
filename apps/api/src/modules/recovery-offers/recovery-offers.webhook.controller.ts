import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { Resend } from "resend";
import { RecoveryOffersService } from "./recovery-offers.service";

@Controller("recovery-offers/webhooks")
export class RecoveryOffersWebhookController {
  private readonly logger = new Logger(RecoveryOffersWebhookController.name);
  private readonly resend: Resend;

  constructor(
    private readonly config: ConfigService,
    private readonly recoveryOffers: RecoveryOffersService,
  ) {
    this.resend = new Resend(this.config.get<string>("RESEND_API_KEY"));
  }

  @Post("resend")
  @HttpCode(HttpStatus.OK)
  async handleResend(@Req() req: RawBodyRequest<Request>) {
    const webhookSecret = this.config.get<string>("RESEND_WEBHOOK_SECRET");
    if (!webhookSecret) {
      this.logger.error("RESEND_WEBHOOK_SECRET is not configured");
      throw new InternalServerErrorException(
        "Resend webhook verification is not configured",
      );
    }
    if (!req.rawBody) {
      throw new InternalServerErrorException("Raw webhook body is unavailable");
    }

    const id = this.header(req, "svix-id");
    const timestamp = this.header(req, "svix-timestamp");
    const signature = this.header(req, "svix-signature");
    if (!id || !timestamp || !signature) {
      throw new BadRequestException("Missing Resend webhook signature headers");
    }

    let event;
    try {
      event = this.resend.webhooks.verify({
        payload: req.rawBody.toString("utf8"),
        headers: { id, timestamp, signature },
        webhookSecret,
      });
    } catch (error) {
      this.logger.warn(
        `Resend webhook signature verification failed: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      throw new BadRequestException("Invalid Resend webhook signature");
    }

    return this.recoveryOffers.recordResendEvent(id, event);
  }

  private header(req: Request, name: string) {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
