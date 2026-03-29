import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  async createSurvey(data: {
    title: string;
    description?: string;
    targetRole?: string;
    questions: Array<{
      text: string;
      type: string;
      options?: any;
      isRequired?: boolean;
      orderIdx: number;
    }>;
  }) {
    return this.prisma.survey.create({
      data: {
        title: data.title,
        description: data.description,
        targetRole: data.targetRole,
        questions: {
          create: data.questions,
        },
      },
      include: {
        questions: true,
      },
    });
  }

  async getAdminSurveys() {
    return this.prisma.survey.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { responses: true },
        },
      },
    });
  }

  async getSurveyResults(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          orderBy: { orderIdx: 'asc' },
          include: {
            answers: true, // we will process these into analytics
          },
        },
      },
    });

    if (!survey) throw new NotFoundException('Survey not found');

    const totalResponses = await this.prisma.surveyResponse.count({
      where: { surveyId },
    });

    const analytics = survey.questions.map((q) => {
      if (q.type === 'RATING') {
        const sum = q.answers.reduce((acc, ans) => acc + Number(ans.value), 0);
        return {
          questionId: q.id,
          text: q.text,
          type: q.type,
          average: q.answers.length ? (sum / q.answers.length).toFixed(1) : 0,
        };
      } else if (q.type === 'MULTIPLE_CHOICE') {
        const counts: Record<string, number> = {};
        q.answers.forEach((ans) => {
          counts[ans.value] = (counts[ans.value] || 0) + 1;
        });
        return {
          questionId: q.id,
          text: q.text,
          type: q.type,
          distribution: counts,
        };
      } else {
        // Text
        return {
          questionId: q.id,
          text: q.text,
          type: q.type,
          recentAnswers: q.answers.slice(-5).map((a) => a.value), // limit to 5 recent
        };
      }
    });

    return {
      surveyId: survey.id,
      title: survey.title,
      totalResponses,
      analytics,
    };
  }

  async setSurveyActive(surveyId: string, isActive: boolean) {
    return this.prisma.survey.update({
      where: { id: surveyId },
      data: { isActive },
    });
  }

  async deleteSurvey(surveyId: string) {
    return this.prisma.survey.delete({
      where: { id: surveyId },
    });
  }

  // User-facing endpoints

  async getActiveSurveyForUser(userId: string, role: string) {
    // Find a published survey targeted either to this role or everyone
    // AND that the user hasn't completed yet.
    return this.prisma.survey.findFirst({
      where: {
        isActive: true,
        OR: [{ targetRole: role }, { targetRole: null }],
        responses: {
          none: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: {
          orderBy: { orderIdx: 'asc' },
        },
      },
    });
  }

  async submitAnswers(
    userId: string,
    surveyId: string,
    answers: Array<{ questionId: string; value: string }>,
  ) {
    const existing = await this.prisma.surveyResponse.findUnique({
      where: { surveyId_userId: { surveyId, userId } },
    });
    if (existing) throw new BadRequestException('You have already taken this survey.');

    return this.prisma.surveyResponse.create({
      data: {
        userId,
        surveyId,
        completedAt: new Date(),
        answers: {
          create: answers.map((ans) => ({
            questionId: ans.questionId,
            value: ans.value,
          })),
        },
      },
    });
  }
}
