import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { MailService } from "../mail/mail.service";
import { SkipSecurity } from "../security/security.guard";

class ContactFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  company?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  interest?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  source?: string;
}

@ApiTags("contact")
@Controller("public/contact")
@SkipSecurity()
export class ContactController {
  constructor(private mail: MailService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: "Submit contact form — sends email to sales@orivraa.com" })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async submitContactForm(@Body() dto: ContactFormDto) {
    const result = await this.mail.sendContactForm(dto);
    return {
      success: result.success,
      message: result.success
        ? "Thank you! We'll get back to you within 24 hours."
        : "Something went wrong. Please email us directly at sales@orivraa.com.",
    };
  }
}
