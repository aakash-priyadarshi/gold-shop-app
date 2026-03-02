import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";

export enum ReleasePlatform {
  WINDOWS = "WINDOWS",
  MACOS = "MACOS",
  WEB = "WEB",
}

export enum ChangelogSource {
  GITHUB = "github",
  MANUAL = "manual",
  MERGED = "merged",
}

export class CreateReleaseDto {
  @IsString()
  @Matches(/^\d+\.\d+\.\d+/, { message: "Version must be semver (e.g. 0.2.0)" })
  version: string;

  @IsEnum(ReleasePlatform)
  platform: ReleasePlatform;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString()
  @IsOptional()
  downloadUrl?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  changelog?: string;

  @IsString()
  @IsOptional()
  githubChangelog?: string;

  @IsEnum(ChangelogSource)
  @IsOptional()
  changelogSource?: ChangelogSource;

  @IsBoolean()
  @IsOptional()
  isLatest?: boolean;

  @IsString()
  @IsOptional()
  minOs?: string;

  @IsString()
  @IsOptional()
  minRam?: string;

  @IsString()
  @IsOptional()
  minDisk?: string;

  @IsString()
  @IsOptional()
  architecture?: string;
}

export class UpdateReleaseDto {
  @IsString()
  @IsOptional()
  changelog?: string;

  @IsEnum(ChangelogSource)
  @IsOptional()
  changelogSource?: ChangelogSource;

  @IsBoolean()
  @IsOptional()
  isLatest?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  downloadUrl?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  minOs?: string;

  @IsString()
  @IsOptional()
  minRam?: string;

  @IsString()
  @IsOptional()
  minDisk?: string;
}

export class DesktopHeartbeatDto {
  @IsString()
  appVersion: string;

  @IsString()
  os: string;

  @IsString()
  @IsOptional()
  arch?: string;
}

export class PublishReleaseDto {
  @IsString()
  @Matches(/^\d+\.\d+\.\d+/)
  version: string;

  @IsEnum(ReleasePlatform)
  platform: ReleasePlatform;

  @IsString()
  @IsOptional()
  downloadUrl?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  changelog?: string;

  @IsString()
  @IsOptional()
  minOs?: string;

  @IsString()
  @IsOptional()
  architecture?: string;
}
