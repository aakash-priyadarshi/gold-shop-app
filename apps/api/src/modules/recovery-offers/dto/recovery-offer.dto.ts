import { PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export const RECOVERY_OFFER_DELIVERY_TIMINGS = [
  "IMMEDIATE",
  "NEXT_LOCAL_10AM",
  "CUSTOM",
] as const;

export type RecoveryOfferDeliveryTiming =
  (typeof RECOVERY_OFFER_DELIVERY_TIMINGS)[number];

export const OFFER_CAMPAIGN_KINDS = [
  "RECOVERY",
  "FESTIVAL",
  "PRODUCT_UPDATE",
] as const;
export type OfferCampaignKindInput = (typeof OFFER_CAMPAIGN_KINDS)[number];
export const OFFER_EMAIL_IMAGE_MODES = [
  "KEEP",
  "DEFAULT",
  "URL",
  "UPLOAD",
] as const;
export type OfferEmailImageMode = (typeof OFFER_EMAIL_IMAGE_MODES)[number];

export class FestivalCalendarQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2078)
  startYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  years?: number;
}

export class CreateOfferCampaignDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  key: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @IsIn(OFFER_CAMPAIGN_KINDS)
  kind: OfferCampaignKindInput;

  @IsInt()
  @Min(0)
  @Max(90)
  complimentaryDays: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsString()
  @MinLength(3)
  @MaxLength(180)
  emailSubject: string;

  @IsString()
  @MinLength(3)
  @MaxLength(180)
  emailHeading: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  emailBody: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^https?:\/\/\S+$/i, {
    message: "imageUrl must be an http(s) URL or empty to use the default",
  })
  @MaxLength(500)
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^$|^https:\/\/\S+$/i, {
    message: "ctaUrl must be an https URL or empty",
  })
  @MaxLength(500)
  ctaUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ctaLabel?: string | null;
}

export class UpdateOfferCampaignDto extends PartialType(
  CreateOfferCampaignDto,
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOfferCampaignEmailDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  emailSubject: string;

  @IsString()
  @MinLength(3)
  @MaxLength(180)
  emailHeading: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  emailBody: string;

  @IsIn(OFFER_EMAIL_IMAGE_MODES)
  imageMode: OfferEmailImageMode;

  @IsOptional()
  @IsString()
  @Matches(/^$|^https?:\/\/\S+$/i, {
    message: "imageUrl must be an http(s) URL",
  })
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^https:\/\/\S+$/i, {
    message: "ctaUrl must be an https URL or empty",
  })
  @MaxLength(500)
  ctaUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ctaLabel?: string | null;
}

/**
 * Block-based design saved by the advanced product-update email builder.
 * Blocks are deeply validated by parseOfferEmailDesign in the service —
 * class-validator only checks the envelope.
 */
export class SaveOfferCampaignEmailDesignDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  emailSubject: string;

  @IsArray()
  @ArrayMaxSize(40)
  blocks: unknown[];
}

export class PreviewRecoveryOffersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  reportIds: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  campaignKey?: string;
}

export class SendRecoveryOffersDto extends PreviewRecoveryOffersDto {
  @IsBoolean()
  confirmed: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  expiresInDays?: number;

  @IsOptional()
  @IsIn(RECOVERY_OFFER_DELIVERY_TIMINGS)
  @IsString()
  deliveryTiming?: RecoveryOfferDeliveryTiming;
}

export class PreviewRecoveryAudienceDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  campaignKey?: string;
}

export class RecoveryRecipientScheduleDto {
  @IsString()
  userId: string;

  @IsDateString()
  scheduledAt: string;
}

export class SendRecoveryAudienceDto extends PreviewRecoveryAudienceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(250)
  @IsString({ each: true })
  userIds: string[];

  @IsBoolean()
  confirmed: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  expiresInDays?: number;

  @IsOptional()
  @IsIn(RECOVERY_OFFER_DELIVERY_TIMINGS)
  @IsString()
  deliveryTiming?: RecoveryOfferDeliveryTiming;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecoveryRecipientScheduleDto)
  recipientSchedules?: RecoveryRecipientScheduleDto[];
}

export class RecoveryOfferTokenDto {
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  token: string;
}
