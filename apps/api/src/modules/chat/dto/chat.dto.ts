import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateConversationDto {
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsUUID()
  rfqId?: string;

  @IsUUID()
  shopId: string;

  /** Used by shopkeepers to specify which customer (buyer) to message */
  @IsOptional()
  @IsUUID()
  buyerId?: string;
}

export class SendMessageDto {
  @IsString()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  attachmentType?: string;
}

export class ConversationFilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
