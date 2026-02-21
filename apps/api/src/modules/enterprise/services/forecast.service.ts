import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get demand forecasts for a shop.
   */
  async getForecasts(shopId: string, period?: string) {
    return this.prisma.demandForecast.findMany({
      where: {
        shopId,
        ...(period ? { period } : {}),
      },
      orderBy: [{ period: "desc" }, { confidenceScore: "desc" }],
    });
  }

  /**
   * Generate demand forecasts based on historical order data.
   * Uses statistical analysis of past orders to predict future demand.
   * In production, this could integrate with a Gemini/OpenAI API for smarter predictions.
   */
  async generateForecasts(shopId: string) {
    const now = new Date();
    const nextMonth = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}`;

    // Analyze last 6 months of orders by category
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const orders = await this.prisma.order.findMany({
      where: {
        shopId,
        createdAt: { gte: sixMonthsAgo },
        status: { in: ["DELIVERED", "COMPLETED"] as any[] },
      },
      select: {
        id: true,
        createdAt: true,
        productSnapshot: true,
      },
    });

    // Aggregate by category (simplified)
    const categoryDemand: Record<string, number[]> = {};

    for (const order of orders) {
      const snapshot = (order.productSnapshot as Record<string, any>) || {};
      const cat = snapshot.jewelleryType || snapshot.category || "GENERAL";
      if (!categoryDemand[cat]) categoryDemand[cat] = [];
      categoryDemand[cat].push(snapshot.quantity || 1);
    }

    const forecasts = [];

    for (const [category, demands] of Object.entries(categoryDemand)) {
      const totalDemand = demands.reduce((a, b) => a + b, 0);
      const avgMonthlyDemand = Math.round(totalDemand / 6);
      const confidenceScore = Math.min(0.95, 0.5 + demands.length * 0.01);

      // Seasonal factor (simplified — higher in wedding/festival months)
      const nextMonthNum = now.getMonth() + 2;
      const seasonalFactor =
        [10, 11, 12, 1, 2, 4, 5].includes(nextMonthNum) ? 1.2 : 0.9;

      const predictedDemand = Math.round(avgMonthlyDemand * seasonalFactor);

      const recommendation =
        predictedDemand > avgMonthlyDemand * 1.1
          ? `Demand for ${category} is expected to increase. Consider stocking ${Math.round(predictedDemand * 1.15)} units.`
          : predictedDemand < avgMonthlyDemand * 0.9
            ? `Demand for ${category} may slow down. Consider reducing inventory to avoid overstock.`
            : `Demand for ${category} is stable. Maintain current stock levels.`;

      const forecast = await this.prisma.demandForecast.create({
        data: {
          shopId,
          period: nextMonth,
          category,
          predictedDemand,
          confidenceScore: Math.round(confidenceScore * 100) / 100,
          factors: {
            seasonal: seasonalFactor,
            historicalAvg: avgMonthlyDemand,
            dataPoints: demands.length,
          } as any,
          recommendation,
        },
      });

      forecasts.push(forecast);
    }

    this.logger.log(
      `Generated ${forecasts.length} demand forecasts for shop ${shopId}`,
    );

    return forecasts;
  }

  /**
   * Get AI-powered recommendations summary for a shop.
   */
  async getRecommendations(shopId: string) {
    const forecasts = await this.prisma.demandForecast.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const highDemand = forecasts.filter((f) => f.predictedDemand > 10);
    const lowConfidence = forecasts.filter((f) => f.confidenceScore < 0.6);

    return {
      totalForecasts: forecasts.length,
      highDemandCategories: highDemand.map((f) => ({
        category: f.category,
        predictedDemand: f.predictedDemand,
        recommendation: f.recommendation,
      })),
      lowConfidenceForecasts: lowConfidence.length,
      topRecommendations: forecasts
        .filter((f) => f.recommendation)
        .slice(0, 5)
        .map((f) => f.recommendation),
    };
  }
}
