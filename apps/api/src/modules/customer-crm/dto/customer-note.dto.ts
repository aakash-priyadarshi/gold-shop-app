import { IsOptional, IsString, MaxLength } from "class-validator";

export class AddCustomerNoteDto {
  @IsString()
  @MaxLength(2000)
  note: string;

  @IsOptional()
  @IsString()
  category?: string; // GENERAL, PREFERENCE, FOLLOW_UP, COMPLAINT, VIP
}
