import { IsOptional, IsString } from "class-validator";

export class CreatePosSessionDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}
