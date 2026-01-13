import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckPhoneDto {
  @ApiProperty({ example: '+919876543210', description: 'Phone number to check' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Phone number must be valid' })
  phone: string;
}
