import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
