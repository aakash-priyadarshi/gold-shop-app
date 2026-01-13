import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
