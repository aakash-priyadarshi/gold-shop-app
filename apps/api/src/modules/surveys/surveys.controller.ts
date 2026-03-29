import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('surveys')
@Controller('surveys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  // -------------------------
  // USER FACING ROUTES
  // -------------------------

  @Get('active')
  @ApiOperation({ summary: 'Get current active survey for logged in user' })
  async getActiveSurvey(@CurrentUser() user: any) {
    return this.surveysService.getActiveSurveyForUser(user.id, user.role);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit answers for a survey' })
  async submitAnswers(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { answers: Array<{ questionId: string; value: string }> },
  ) {
    return this.surveysService.submitAnswers(user.id, id, body.answers);
  }

  // -------------------------
  // ADMIN FACING ROUTES
  // -------------------------

  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all surveys indicating response counts' })
  async getAdminSurveys() {
    return this.surveysService.getAdminSurveys();
  }

  @Post('admin/create')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new survey draft' })
  async createSurvey(
    @Body()
    body: {
      title: string;
      description?: string;
      targetRole?: string;
      questions: Array<{ text: string; type: string; options?: any; isRequired?: boolean; orderIdx: number }>;
    },
  ) {
    return this.surveysService.createSurvey(body);
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish or unpublish survey' })
  async setStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.surveysService.setSurveyActive(id, body.isActive);
  }

  @Get('admin/:id/results')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'View the analytical results of a survey' })
  async getResults(@Param('id') id: string) {
    return this.surveysService.getSurveyResults(id);
  }

  @Delete('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Permanently delete survey and associated data' })
  async deleteSurvey(@Param('id') id: string) {
    return this.surveysService.deleteSurvey(id);
  }
}
