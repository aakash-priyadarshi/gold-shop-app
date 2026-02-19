import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateItemDto {
  @IsInt()
  @Min(0) // 0 = remove
  qty: number;
}

export class CheckoutDto {
  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  taxRate?: number;

  @IsOptional()
  discountAmount?: number;
}
