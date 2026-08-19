import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UI_LOCALE_CODES } from "@gold-shop/shared";
import { CurrencyCode } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { SUPPORTED_MARKET_COUNTRIES } from "../../../common/market/country-currency";

// Shop creation DTO for shopkeeper registration
export class CreateShopDto {
  @ApiProperty({ example: "Ramesh Gold House" })
  @IsString()
  @IsNotEmpty()
  shopName: string;

  @ApiProperty({
    example: "NP",
    enum: SUPPORTED_MARKET_COUNTRIES,
    description: "Supported market country code",
  })
  @IsIn(SUPPORTED_MARKET_COUNTRIES)
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    example: "NPR",
    enum: CurrencyCode,
    description: "Supported billing currency code",
  })
  @IsEnum(CurrencyCode)
  @IsNotEmpty()
  currency: CurrencyCode;

  @ApiProperty({ example: "Kathmandu" })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: "Thamel, Kathmandu" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: "+9779812345678" })
  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @ApiPropertyOptional({ example: "shop@example.com" })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: "Referral code when converting a customer account to a shop",
  })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "+9779812345678" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: "SecurePassword123!" })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: "John" })
  @IsString()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  lastName: string;

  @ApiProperty({ enum: ["CUSTOMER", "SHOPKEEPER"], example: "CUSTOMER" })
  @IsEnum(["CUSTOMER", "SHOPKEEPER"])
  role: "CUSTOMER" | "SHOPKEEPER";

  @ApiPropertyOptional({ enum: UI_LOCALE_CODES, default: "en" })
  @IsOptional()
  @IsIn([...UI_LOCALE_CODES])
  preferredLanguage?: string;

  @ApiPropertyOptional({
    description: "Referral code from ?ref= on /auth/register",
    example: "A1B2C3D4E5F6",
  })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional({ description: "Cloudflare Turnstile CAPTCHA token" })
  @IsOptional()
  @IsString()
  turnstileToken?: string;

  @ApiPropertyOptional({
    description: "Required for SHOPKEEPER registration",
    type: CreateShopDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateShopDto)
  shop?: CreateShopDto;
}
