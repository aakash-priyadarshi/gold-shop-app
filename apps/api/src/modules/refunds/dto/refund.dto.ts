import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestRefundDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class ProcessRefundDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RejectRefundDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  rejectionReason: string;
}
