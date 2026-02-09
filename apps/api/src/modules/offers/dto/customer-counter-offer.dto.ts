import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";

/**
 * DTO for customer counter-offers in the RFQ negotiation flow
 */
export class CustomerCounterOfferDto {
  @ApiProperty({
    example: 45000,
    description: "Customer proposed total price in NPR",
  })
  @IsNumber()
  @Min(1)
  proposedPriceNpr: number;

  @ApiPropertyOptional({
    example: "I would like to pay ₹45,000 instead of ₹50,000",
    description: "Message explaining the counter-offer",
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    example: 10,
    description: "Customer preferred delivery days",
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  preferredDeliveryDays?: number;
}
