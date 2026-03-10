import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class SetupPasswordDto {
  @ApiProperty({ example: "admin@orivraa.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Temporary token sent to employee email" })
  @IsString()
  setupToken: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
