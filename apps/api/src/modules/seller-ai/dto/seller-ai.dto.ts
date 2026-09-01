import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export const SELLER_AI_SCOPES = [
  "inventory:read",
  "inventory:write",
  "orders:read",
  "orders:write",
] as const;

export type SellerAiScope = (typeof SELLER_AI_SCOPES)[number];

export class CreateSellerAiKeyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsIn(SELLER_AI_SCOPES, { each: true })
  scopes: SellerAiScope[];

  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays: number;
}
