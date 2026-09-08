import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsISO8601,
  IsString,
  IsUUID,
  Length,
} from "class-validator";
import { SUPPORT_PERMISSION_IDS } from "./support-access.policy";

export class RequestSupportAccessDto {
  @IsUUID() conversationId: string;
  @IsUUID() shopId: string;
  @IsString() @Length(5, 500) reason: string;
}

export class ApproveSupportAccessDto {
  @IsISO8601() expiresAt: string;
  @IsArray()
  @ArrayUnique()
  @IsIn(SUPPORT_PERMISSION_IDS, { each: true })
  permissions: string[];
}

export class GrantSupportAccessDto extends RequestSupportAccessDto {
  @IsISO8601() expiresAt: string;
  @IsArray()
  @ArrayUnique()
  @IsIn(SUPPORT_PERMISSION_IDS, { each: true })
  permissions: string[];
}
