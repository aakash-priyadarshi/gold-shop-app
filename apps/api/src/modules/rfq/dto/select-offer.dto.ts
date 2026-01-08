import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectOfferDto {
  @ApiProperty({ description: 'ID of the offer to select' })
  @IsUUID()
  offerId: string;
}
