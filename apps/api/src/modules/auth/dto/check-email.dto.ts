import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckEmailDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email to check' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
