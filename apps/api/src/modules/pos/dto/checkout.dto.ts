import { IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

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

  // ── Structured POS payment fields ──────────────────────────────
  @IsOptional()
  @IsString()
  paymentMethod?: string; // CASH, CARD, UPI, ESEWA, KHALTI, BANK_TRANSFER

  @IsOptional()
  @IsNumber()
  makingChargeRate?: number; // percentage e.g. 8.0

  @IsOptional()
  @IsNumber()
  makingChargesNpr?: number; // flat override amount
}

