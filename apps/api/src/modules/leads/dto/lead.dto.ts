import { LeadSource, LeadStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class IngestLeadItemDto {
  @IsString()
  @IsNotEmpty()
  shopName: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsInt()
  reviewCount?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class ImportLeadsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestLeadItemDto)
  leads: IngestLeadItemDto[];
}

export class GetLeadsFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  shopName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class BulkUpdateLeadStatusDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsEnum(LeadStatus)
  status: LeadStatus;
}

export class SendOutreachCampaignDto {
  @IsArray()
  @IsString({ each: true })
  leadIds: string[];

  @IsString()
  @IsNotEmpty()
  campaignKey: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  bodyTemplate: string;

  @IsOptional()
  @IsString()
  festivalName?: string;

  @IsOptional()
  @IsInt()
  @Min(14)
  @Max(90)
  offerTrialDays?: number = 60;
}

export class PreviewOutreachDto {
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  bodyTemplate: string;

  @IsOptional()
  @IsString()
  festivalName?: string;

  @IsOptional()
  @IsInt()
  offerTrialDays?: number = 60;
}

export class SendWhatsAppMessageDto {
  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class SendWhatsAppCampaignDto {
  @IsArray()
  @IsString({ each: true })
  leadIds: string[];

  @IsString()
  @IsNotEmpty()
  templateText: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  festivalName?: string;
}

export class ToggleAiBotDto {
  @IsNotEmpty()
  paused: boolean;
}
