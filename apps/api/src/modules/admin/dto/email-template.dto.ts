import { IsString, IsOptional, IsObject } from "class-validator";

export class CreateEmailTemplateDto {
  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class PreviewEmailTemplateDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}
