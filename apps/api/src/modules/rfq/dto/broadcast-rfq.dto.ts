import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BroadcastRfqDto {
  @ApiProperty({
    description: 'Shop IDs to broadcast the RFQ to',
    example: ['uuid1', 'uuid2', 'uuid3'],
    minItems: 1,
    maxItems: 20,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  shopIds: string[];
}
