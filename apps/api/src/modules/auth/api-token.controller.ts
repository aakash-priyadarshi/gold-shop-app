import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApiTokenService, API_TOKEN_SCOPES } from './api-token.service';
import { 
  CreateApiTokenDto, 
  ApiTokenResponseDto, 
  CreateApiTokenResponseDto 
} from './dto/api-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('API Tokens')
@Controller('auth/api-tokens')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApiTokenController {
  constructor(private readonly apiTokenService: ApiTokenService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ 
    summary: 'Create API token',
    description: 'Create a long-lived API token for CI/CD or external integrations. Only ADMIN users can create tokens.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Token created successfully. The full token is only shown once!',
    type: CreateApiTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createToken(
    @Request() req: any,
    @Body() dto: CreateApiTokenDto,
  ): Promise<CreateApiTokenResponseDto> {
    return this.apiTokenService.createToken(req.user.id, dto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ 
    summary: 'List API tokens',
    description: 'List all active API tokens for the current user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of tokens',
    type: [ApiTokenResponseDto],
  })
  async listTokens(@Request() req: any): Promise<ApiTokenResponseDto[]> {
    return this.apiTokenService.listTokens(req.user.id);
  }

  @Get('stats')
  @Roles('ADMIN')
  @ApiOperation({ 
    summary: 'Get token statistics',
    description: 'Get statistics about API tokens for the admin dashboard'
  })
  @ApiResponse({ status: 200, description: 'Token statistics' })
  async getTokenStats(@Request() req: any) {
    return this.apiTokenService.getTokenStats(req.user.id);
  }

  @Get('expiring')
  @Roles('ADMIN')
  @ApiOperation({ 
    summary: 'Get expiring tokens',
    description: 'Get tokens that will expire within 7 days'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of expiring tokens',
    type: [ApiTokenResponseDto],
  })
  async getExpiringTokens(@Request() req: any): Promise<ApiTokenResponseDto[]> {
    return this.apiTokenService.getExpiringTokens(req.user.id);
  }

  @Get('scopes')
  @Roles('ADMIN')
  @ApiOperation({ 
    summary: 'Get available scopes',
    description: 'Get list of available permission scopes for API tokens'
  })
  @ApiResponse({ status: 200, description: 'Available scopes' })
  async getAvailableScopes() {
    return {
      scopes: Object.entries(API_TOKEN_SCOPES).map(([key, description]) => ({
        scope: key,
        description,
      })),
    };
  }

  @Delete(':tokenId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Revoke API token',
    description: 'Revoke an API token by ID'
  })
  @ApiParam({ name: 'tokenId', description: 'Token ID to revoke' })
  @ApiResponse({ status: 204, description: 'Token revoked successfully' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async revokeToken(
    @Request() req: any,
    @Param('tokenId') tokenId: string,
  ): Promise<void> {
    await this.apiTokenService.revokeToken(req.user.id, tokenId);
  }
}
