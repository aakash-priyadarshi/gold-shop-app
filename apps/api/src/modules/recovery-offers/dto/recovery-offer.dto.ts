import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

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
}

export class RecoveryOfferTokenDto {
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  token: string;
}
