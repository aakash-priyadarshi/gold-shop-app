import { Type } from "class-transformer";
import { CurrencyCode } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class InvoiceLineItemDto {
  @IsString()
  label: string;

  @IsString()
  category: string; // METAL, MAKING, GEMSTONE, FINISH, TAX, DISCOUNT, etc.

  @IsNumber()
  @Min(0.000001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsIn(["TAXABLE", "EXEMPT"])
  taxTreatment?: "TAXABLE" | "EXEMPT";

  @IsOptional()
  @IsString()
  details?: string;

  /** POS / stock restore: inventory item this line was sold from */
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  /**
   * Optional pricing breakdown — when present on a collapsed jewellery line
   * (RING, PRODUCT, etc.), InvoicesService expands into METAL / MAKING / GEMSTONE
   * before tax calculation so reports and accounting stay accurate.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  metalCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  makingCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gemstoneCost?: number;

  @IsOptional()
  @IsString()
  metalType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  metalWeightG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wastageCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wastagePercent?: number;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  shopQuoteId?: string;

  @IsOptional()
  @IsString()
  walkInCustomerId?: string;

  /** Marketplace customer selected at the counter or in the CRM. */
  @IsOptional()
  @IsUUID()
  registeredCustomerId?: string;

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
  @Min(0)
  @Max(1)
  taxRate?: number;

  @IsOptional()
  @IsString()
  taxLabel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

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
  @IsString()
  taxExemptEvidence?: string;

  @IsOptional()
  @IsIn(["B2C", "B2B"])
  customerType?: "B2C" | "B2B";

  @IsOptional()
  @IsBoolean()
  purchaserVatRegistered?: boolean;

  @IsOptional()
  @IsBoolean()
  taxInvoiceRequested?: boolean;

  // Backward-compatible alias used by the current invoice UI.
  @IsOptional()
  @IsBoolean()
  requestTaxInvoice?: boolean;

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
  @IsDateString()
  supplyDate?: string;

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
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
