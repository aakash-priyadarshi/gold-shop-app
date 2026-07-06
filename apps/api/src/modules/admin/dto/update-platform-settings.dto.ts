import { IsString, IsBoolean, IsOptional, IsObject } from "class-validator";

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsString()
  siteName?: string;

  @IsOptional()
  @IsString()
  siteDescription?: string;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  apiKeys?: Record<string, string>;

  [key: string]: any; // Allow additional fields since platform settings are dynamic
}
