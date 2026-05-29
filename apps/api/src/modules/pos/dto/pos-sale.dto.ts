import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class PosSaleItemDto {
  @IsString()
  inventoryItemId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsInt()
  @Min(1)
  qty: number;

  /**
   * The unit price actually charged at the point of sale. Sent by the client
   * so an offline sale replayed later bills the price the customer agreed to,
   * not the (possibly changed) current server price. Falls back to the live
   * inventory/variant price when omitted.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

/**
 * Single-shot, idempotent POS sale. Collapses the create-session → add-items →
 * checkout flow into one request so it can be queued and replayed offline.
 */
export class PosSaleDto {
  /** Client-generated UUID for offline idempotency. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PosSaleItemDto)
  items: PosSaleItemDto[];

  @IsString()
  @MaxLength(200)
  customerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentMethod?: string; // CASH, CARD, UPI, ESEWA, KHALTI, BANK_TRANSFER

  @IsOptional()
  @IsNumber()
  makingChargeRate?: number; // percentage e.g. 8.0

  @IsOptional()
  @IsNumber()
  makingChargesNpr?: number; // flat override amount

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /**
   * True when this sale physically happened on the device while offline and is
   * now being replayed. In that case the server tolerates insufficient stock
   * (the goods already left the shop) instead of rejecting the sale.
   */
  @IsOptional()
  @IsBoolean()
  occurredOffline?: boolean;

  /** When the sale physically happened (for accurate reporting on replay). */
  @IsOptional()
  @IsISO8601()
  soldAt?: string;
}
