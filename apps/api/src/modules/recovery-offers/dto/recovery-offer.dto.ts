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

export const OFFER_CAMPAIGN_KINDS = ["RECOVERY", "FESTIVAL"] as const;
export type OfferCampaignKindInput = (typeof OFFER_CAMPAIGN_KINDS)[number];

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
  @Min(1)
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
}

export class UpdateOfferCampaignDto extends PartialType(
  CreateOfferCampaignDto,
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
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
