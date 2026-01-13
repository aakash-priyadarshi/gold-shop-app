import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: 'User ID returned from registration' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: '6-digit OTP code', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  code: string;
}
