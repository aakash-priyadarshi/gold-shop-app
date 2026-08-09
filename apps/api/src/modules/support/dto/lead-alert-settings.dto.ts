import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
} from "class-validator";

export class UpdateLeadAlertSettingsDto {
  @ApiProperty({
    description: "Email addresses that receive AI lead capture alerts",
    example: ["founder@orivraa.com"],
  })
  @IsArray()
  @ArrayMaxSize(10)
  @IsEmail({}, { each: true })
  emails: string[];

  @ApiProperty({
    description: "Send a daily 9 AM digest of uncontacted NEW leads",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  digestEnabled?: boolean;
}
