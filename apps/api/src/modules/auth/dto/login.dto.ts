import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "SecurePassword123!" })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: "Cloudflare Turnstile CAPTCHA token" })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
