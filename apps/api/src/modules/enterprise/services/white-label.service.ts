import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class WhiteLabelService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(shopId: string) {
    const config = await this.prisma.whiteLabelConfig.findUnique({
      where: { shopId },
    });
    if (!config) {
      // Return defaults
      return {
        shopId,
        customDomain: null,
        logoUrl: null,
        faviconUrl: null,
        primaryColor: "#D4AF37",
        secondaryColor: "#1F2937",
        accentColor: "#F59E0B",
        fontFamily: "Inter",
        headerHtml: null,
        footerHtml: null,
        hideOrivraa: false,
        customCss: null,
        metaTitle: null,
        metaDescription: null,
        ogImageUrl: null,
        isActive: false,
      };
    }
    return config;
  }

  async upsertConfig(
    shopId: string,
    data: Partial<{
      customDomain: string | null;
      logoUrl: string | null;
      faviconUrl: string | null;
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      fontFamily: string;
      headerHtml: string | null;
      footerHtml: string | null;
      hideOrivraa: boolean;
      customCss: string | null;
      metaTitle: string | null;
      metaDescription: string | null;
      ogImageUrl: string | null;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.whiteLabelConfig.upsert({
      where: { shopId },
      create: { shopId, ...data },
      update: data,
    });
  }

  /**
   * Resolve a custom domain to a shop.
   * Used by middleware to serve white-label storefronts.
   */
  async resolveCustomDomain(domain: string) {
    const config = await this.prisma.whiteLabelConfig.findFirst({
      where: { customDomain: domain, isActive: true },
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });
    if (!config || !config.shop.isActive) return null;
    return config;
  }
}
