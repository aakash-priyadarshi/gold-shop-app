import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { TeamLoginDto } from "./dto/login.dto";
import { SetupPasswordDto } from "./dto/setup-password.dto";
import { Public } from "./public.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() dto: TeamLoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post("setup-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Set password for new employee using their employee code",
  })
  @ApiResponse({ status: 200, description: "Password set successfully" })
  @ApiResponse({ status: 400, description: "Invalid setup token or employee" })
  async setupPassword(@Body() dto: SetupPasswordDto) {
    return this.authService.setupPassword(
      dto.email,
      dto.setupToken,
      dto.password,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current employee profile" })
  @ApiResponse({ status: 200, description: "Current employee profile" })
  async getMe(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }
}
