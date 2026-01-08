import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+9779812345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ enum: ['CUSTOMER', 'SHOPKEEPER'], example: 'CUSTOMER' })
  @IsEnum(['CUSTOMER', 'SHOPKEEPER'])
  role: 'CUSTOMER' | 'SHOPKEEPER';

  @ApiPropertyOptional({ enum: ['en', 'ne', 'hi'], default: 'en' })
  @IsOptional()
  @IsEnum(['en', 'ne', 'hi'])
  preferredLanguage?: string;
}
