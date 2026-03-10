import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class TeamLoginDto {
  @ApiProperty({ example: "admin@orivraa.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @MinLength(6)
  password: string;
}
