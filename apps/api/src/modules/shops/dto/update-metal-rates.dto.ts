import { IsArray, ValidateNested, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class MetalRateDto {
  @ApiProperty({ example: 'GOLD_24K' })
  @IsString()
  metalType: string;

  @ApiProperty({ example: 10500 })
  @IsNumber()
  @Min(0)
  ratePerGramNpr: number;
}

export class UpdateMetalRatesDto {
  @ApiProperty({
    type: [MetalRateDto],
    example: [
      { metalType: 'GOLD_24K', ratePerGramNpr: 10500 },
      { metalType: 'GOLD_22K', ratePerGramNpr: 9800 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetalRateDto)
  rates: MetalRateDto[];
}
