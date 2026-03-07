import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketRegion, CurrencyCode, WeightUnit, PaymentMethod } from '@prisma/client';
import { UpdateMarketConfigDto } from './dto/update-market-config.dto';

// Default market configurations
const DEFAULT_CONFIGS: Record<string, {
  countryName: string;
  defaultCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  defaultWeightUnit: WeightUnit;
  supportedWeightUnits: WeightUnit[];
  supportedPaymentMethods: PaymentMethod[];
  heroHeadline: string;
  heroSubheadline: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  taxPercentage: number;
  taxName: string;
  priceMultiplier: number;
  codEnabled: boolean;
}> = {
  NP: {
    countryName: 'Nepal',
    defaultCurrency: 'NPR',
    supportedCurrencies: ['NPR', 'USD', 'INR'],
    defaultWeightUnit: 'TOLA',
    supportedWeightUnits: ['GRAM', 'TOLA', 'LAAL'],
    supportedPaymentMethods: ['CARD', 'BANK_TRANSFER', 'CASH', 'ESEWA', 'KHALTI', 'CONNECTIPS', 'PAID_AT_SHOP'],
    heroHeadline: "Nepal's No.1 Jewellery Marketplace",
    heroSubheadline: 'Trusted by thousands of customers across Nepal',
    contactEmail: 'nepal@orivraa.com',
    contactPhone: '+977-1-4XXXXXX',
    contactAddress: 'Kathmandu, Nepal',
    taxPercentage: 13,
    taxName: 'VAT',
    priceMultiplier: 1.245,
    codEnabled: true,
  },
  IN: {
    countryName: 'India',
    defaultCurrency: 'INR',
    supportedCurrencies: ['INR', 'USD'],
    defaultWeightUnit: 'GRAM',
    supportedWeightUnits: ['GRAM', 'KILOGRAM', 'TOLA'],
    supportedPaymentMethods: ['CARD', 'BANK_TRANSFER', 'CASH', 'UPI', 'PAID_AT_SHOP'],
    heroHeadline: "India's Premium Jewellery Destination",
    heroSubheadline: 'Exquisite craftsmanship, timeless elegance',
    contactEmail: 'india@orivraa.com',
    contactPhone: '+91-XXXXXXXXXX',
    contactAddress: 'Mumbai, India',
    taxPercentage: 3,
    taxName: 'GST',
    priceMultiplier: 1.100,
    codEnabled: true,
  },
  US: {
    countryName: 'United States',
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD'],
    defaultWeightUnit: 'OUNCE',
    supportedWeightUnits: ['GRAM', 'OUNCE', 'POUND'],
    supportedPaymentMethods: ['CARD', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'PAID_AT_SHOP'],
    heroHeadline: 'Discover Authentic South Asian Jewellery',
    heroSubheadline: 'Handcrafted pieces shipped worldwide',
    contactEmail: 'usa@orivraa.com',
    contactPhone: '+1-XXX-XXX-XXXX',
    contactAddress: 'New York, USA',
    taxPercentage: 0,
    taxName: 'Sales Tax',
    priceMultiplier: 1.000,
    codEnabled: false,
  },
  UK: {
    countryName: 'United Kingdom',
    defaultCurrency: 'GBP',
    supportedCurrencies: ['GBP', 'USD', 'EUR'],
    defaultWeightUnit: 'GRAM',
    supportedWeightUnits: ['GRAM', 'KILOGRAM', 'OUNCE'],
    supportedPaymentMethods: ['CARD', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'PAID_AT_SHOP'],
    heroHeadline: 'Luxury Jewellery from the Himalayas',
    heroSubheadline: 'Traditional artistry meets modern elegance',
    contactEmail: 'uk@orivraa.com',
    contactPhone: '+44-XXXX-XXXXXX',
    contactAddress: 'London, United Kingdom',
    taxPercentage: 20,
    taxName: 'VAT',
    priceMultiplier: 1.010,
    codEnabled: false,
  },
  EU: {
    countryName: 'Europe',
    defaultCurrency: 'EUR',
    supportedCurrencies: ['EUR', 'USD', 'GBP'],
    defaultWeightUnit: 'GRAM',
    supportedWeightUnits: ['GRAM', 'KILOGRAM'],
    supportedPaymentMethods: ['CARD', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'PAID_AT_SHOP'],
    heroHeadline: 'Authentic Asian Jewellery Collection',
    heroSubheadline: 'Discover unique pieces from master artisans',
    contactEmail: 'europe@orivraa.com',
    contactPhone: '+49-XXX-XXXXXXX',
    contactAddress: 'Berlin, Germany',
    taxPercentage: 19,
    taxName: 'VAT',
    priceMultiplier: 1.010,
    codEnabled: false,
  },
  AE: {
    countryName: 'United Arab Emirates',
    defaultCurrency: 'AED',
    supportedCurrencies: ['AED', 'USD'],
    defaultWeightUnit: 'GRAM',
    supportedWeightUnits: ['GRAM', 'TOLA', 'OUNCE'],
    supportedPaymentMethods: ['CARD', 'BANK_TRANSFER', 'CASH', 'PAID_AT_SHOP'],
    heroHeadline: 'Premium Gold & Diamond Jewellery',
    heroSubheadline: 'Experience luxury craftsmanship in Dubai',
    contactEmail: 'dubai@orivraa.com',
    contactPhone: '+971-X-XXXXXXX',
    contactAddress: 'Dubai, UAE',
    taxPercentage: 5,
    taxName: 'VAT',
    priceMultiplier: 1.020,
    codEnabled: true,
  },
};

@Injectable()
export class MarketConfigService {
  // In-memory cache: countryCode → { data, timestamp }
  private configCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get market config by country code (cached for 5 minutes)
   */
  async getConfig(countryCode: string): Promise<any> {
    // Check in-memory cache first
    const cached = this.configCache.get(countryCode);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Try to get from database first
    const dbConfig = await this.prisma.marketConfig.findUnique({
      where: { countryCode: countryCode as MarketRegion },
    });

    if (dbConfig) {
      this.configCache.set(countryCode, { data: dbConfig, timestamp: Date.now() });
      return dbConfig;
    }

    // Return default config if not in database
    const defaultConfig = DEFAULT_CONFIGS[countryCode];
    if (defaultConfig) {
      const result = {
        id: `default-${countryCode}`,
        countryCode: countryCode as MarketRegion,
        ...defaultConfig,
        footerContactTitle: `Contact Us in ${defaultConfig.countryName}`,
        contactWhatsapp: null,
        customOrdersEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.configCache.set(countryCode, { data: result, timestamp: Date.now() });
      return result;
    }

    // If unsupported country, return US config
    return this.getConfig('US');
  }

  /**
   * Detect market from request headers (Vercel/Cloudflare)
   */
  detectCountryFromHeaders(headers: Record<string, string>): string {
    // Vercel header
    const vercelCountry = headers['x-vercel-ip-country'];
    if (vercelCountry) {
      return this.mapToSupportedMarket(vercelCountry);
    }

    // Cloudflare header
    const cfCountry = headers['cf-ipcountry'];
    if (cfCountry) {
      return this.mapToSupportedMarket(cfCountry);
    }

    // Default to US
    return 'US';
  }

  /**
   * Map any country code to a supported market
   */
  mapToSupportedMarket(countryCode: string): string {
    const supportedMarkets = ['NP', 'IN', 'US', 'UK', 'EU', 'AE'];
    
    if (supportedMarkets.includes(countryCode)) {
      return countryCode;
    }

    // European countries → EU
    const europeanCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'NO',
    ];
    if (europeanCountries.includes(countryCode)) {
      return 'EU';
    }

    // Middle East → AE
    const middleEastCountries = ['BH', 'KW', 'OM', 'QA', 'SA'];
    if (middleEastCountries.includes(countryCode)) {
      return 'AE';
    }

    // Default fallback
    return 'US';
  }

  /**
   * Get all market configs (admin)
   */
  async getAllConfigs() {
    const dbConfigs = await this.prisma.marketConfig.findMany({
      orderBy: { countryCode: 'asc' },
    });

    // Merge with defaults for any missing configs
    const allMarkets = ['NP', 'IN', 'US', 'UK', 'EU', 'AE'];
    const result: any[] = [];

    for (const market of allMarkets) {
      const dbConfig = dbConfigs.find(c => c.countryCode === market);
      if (dbConfig) {
        result.push(dbConfig);
      } else {
        const config = await this.getConfig(market);
        result.push(config);
      }
    }

    return result;
  }

  /**
   * Update market config (admin)
   */
  async updateConfig(countryCode: string, dto: UpdateMarketConfigDto) {
    // Check if exists in database
    const existing = await this.prisma.marketConfig.findUnique({
      where: { countryCode: countryCode as MarketRegion },
    });

    if (existing) {
      return this.prisma.marketConfig.update({
        where: { countryCode: countryCode as MarketRegion },
        data: {
          countryName: dto.countryName,
          defaultCurrency: dto.defaultCurrency,
          heroHeadline: dto.heroHeadline,
          heroSubheadline: dto.heroSubheadline,
          footerContactTitle: dto.footerContactTitle,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          contactAddress: dto.contactAddress,
          contactWhatsapp: dto.contactWhatsapp,
          supportedCurrencies: dto.supportedCurrencies,
          supportedWeightUnits: dto.supportedWeightUnits,
          supportedPaymentMethods: dto.supportedPaymentMethods,
          codEnabled: dto.codEnabled,
          customOrdersEnabled: dto.customOrdersEnabled,
          taxPercentage: dto.taxPercentage,
          taxName: dto.taxName,
          priceMultiplier: dto.priceMultiplier,
          isActive: dto.isActive,
          updatedAt: new Date(),
        },
      });
    }

    // Create from defaults if doesn't exist
    const defaultConfig = DEFAULT_CONFIGS[countryCode];
    if (!defaultConfig) {
      throw new NotFoundException(`Market config not found for ${countryCode}`);
    }

    return this.prisma.marketConfig.create({
      data: {
        countryCode: countryCode as MarketRegion,
        countryName: defaultConfig.countryName,
        defaultCurrency: defaultConfig.defaultCurrency,
        supportedCurrencies: dto.supportedCurrencies || defaultConfig.supportedCurrencies,
        defaultWeightUnit: defaultConfig.defaultWeightUnit,
        supportedWeightUnits: dto.supportedWeightUnits || defaultConfig.supportedWeightUnits,
        supportedPaymentMethods: dto.supportedPaymentMethods || defaultConfig.supportedPaymentMethods,
        heroHeadline: dto.heroHeadline || defaultConfig.heroHeadline,
        heroSubheadline: dto.heroSubheadline || defaultConfig.heroSubheadline,
        footerContactTitle: dto.footerContactTitle,
        contactEmail: dto.contactEmail || defaultConfig.contactEmail,
        contactPhone: dto.contactPhone || defaultConfig.contactPhone,
        contactAddress: dto.contactAddress || defaultConfig.contactAddress,
        contactWhatsapp: dto.contactWhatsapp,
        taxPercentage: dto.taxPercentage ?? defaultConfig.taxPercentage,
        taxName: dto.taxName || defaultConfig.taxName,
        priceMultiplier: defaultConfig.priceMultiplier,
        codEnabled: dto.codEnabled ?? defaultConfig.codEnabled,
        customOrdersEnabled: dto.customOrdersEnabled ?? true,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Seed all default market configs
   */
  async seedAllConfigs() {
    const results = [];
    for (const [countryCode, config] of Object.entries(DEFAULT_CONFIGS)) {
      const existing = await this.prisma.marketConfig.findUnique({
        where: { countryCode: countryCode as MarketRegion },
      });

      if (!existing) {
        const created = await this.prisma.marketConfig.create({
          data: {
            countryCode: countryCode as MarketRegion,
            countryName: config.countryName,
            defaultCurrency: config.defaultCurrency,
            supportedCurrencies: config.supportedCurrencies,
            defaultWeightUnit: config.defaultWeightUnit,
            supportedWeightUnits: config.supportedWeightUnits,
            supportedPaymentMethods: config.supportedPaymentMethods,
            heroHeadline: config.heroHeadline,
            heroSubheadline: config.heroSubheadline,
            footerContactTitle: `Contact Us in ${config.countryName}`,
            contactEmail: config.contactEmail,
            contactPhone: config.contactPhone,
            contactAddress: config.contactAddress,
            taxPercentage: config.taxPercentage,
            taxName: config.taxName,
            priceMultiplier: config.priceMultiplier,
            codEnabled: config.codEnabled,
            customOrdersEnabled: true,
            isActive: true,
          },
        });
        results.push(created);
      } else {
        results.push(existing);
      }
    }
    return results;
  }
}
