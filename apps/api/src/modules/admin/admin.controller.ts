import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('verifications')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all verification requests' })
  async getVerifications() {
    const requests = await this.prisma.verificationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        shop: true,
        user: true,
      },
    });
    return { requests };
  }

  @Get('reports')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all user reports' })
  async getReports() {
    const reports = await this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: true,
        reported: true,
      },
    });
    return { reports };
  }
}
