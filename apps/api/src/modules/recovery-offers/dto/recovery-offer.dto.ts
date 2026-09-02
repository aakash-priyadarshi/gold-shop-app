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
