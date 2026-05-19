import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsIn,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";

export class InvoiceLineItemDto {
  @IsString()
  label: string;

  @IsString()
  category: string; // METAL, MAKING, GEMSTONE, FINISH, TAX, DISCOUNT, etc.

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  details?: string;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  shopQuoteId?: string;

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
  customerAddress?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  taxLabel?: string;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  // ── Tax filing fields ──────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  isTaxExempt?: boolean;

  @IsOptional()
  @IsString()
  taxExemptReason?: string;

  @IsOptional()
  @IsIn(["B2C", "B2B"])
  customerType?: "B2C" | "B2B";

  @IsOptional()
  @IsString()
  customerTaxId?: string;

  @IsOptional()
  @IsString()
  invoiceCountry?: string;

  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  taxBreakdown?: Record<string, number>;

  // ── POS payment tracking ───────────────────────────────────────
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsNumber()
  makingChargeRate?: number;

  @IsOptional()
  @IsNumber()
  makingChargesAmt?: number;
}

export class UpdatePaymentDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
