import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

// Shop creation DTO for shopkeeper registration
export class CreateShopDto {
  @ApiProperty({ example: "Ramesh Gold House" })
  @IsString()
  @IsNotEmpty()
  shopName: string;

  @ApiProperty({
    example: "NP",
    description: "Country code: NP, IN, AE, UK, EU, US",
  })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    example: "NPR",
    description: "Currency code: NPR, INR, AED, GBP, EUR, USD",
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

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

  @ApiPropertyOptional({ enum: ["en", "ne", "hi"], default: "en" })
  @IsOptional()
  @IsEnum(["en", "ne", "hi"])
  preferredLanguage?: string;

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
