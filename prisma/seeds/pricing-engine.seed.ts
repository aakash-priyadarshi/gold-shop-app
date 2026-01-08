/**
 * Pricing Engine Seed Data
 * 
 * This file contains seed data for the pricing engine configuration tables.
 * Run this seed to populate:
 * - Metal purity configurations
 * - Base metal prices
 * - Tax rules for all markets
 * - Market adjustments
 * - Finish pricing
 * - Gemstone pricing
 * - Rounding rules
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════
// METAL PURITY CONFIGURATIONS
// ═══════════════════════════════════════════

const METAL_PURITY_CONFIGS = [
  // Gold
  { metalType: 'GOLD', purityCode: 'GOLD_24K', purityName: '24K (999)', multiplier: 1.0, isDefault: true },
  { metalType: 'GOLD', purityCode: 'GOLD_22K', purityName: '22K (916)', multiplier: 0.9167 },
  { metalType: 'GOLD', purityCode: 'GOLD_18K', purityName: '18K (750)', multiplier: 0.75 },
  { metalType: 'GOLD', purityCode: 'GOLD_14K', purityName: '14K (585)', multiplier: 0.585 },
  { metalType: 'GOLD', purityCode: 'GOLD_10K', purityName: '10K (417)', multiplier: 0.417 },
  
  // Silver
  { metalType: 'SILVER', purityCode: 'SILVER_999', purityName: 'Fine Silver (999)', multiplier: 1.0, isDefault: true },
  { metalType: 'SILVER', purityCode: 'SILVER_925', purityName: 'Sterling Silver (925)', multiplier: 0.925 },
  { metalType: 'SILVER', purityCode: 'SILVER_900', purityName: 'Coin Silver (900)', multiplier: 0.90 },
  
  // Platinum
  { metalType: 'PLATINUM', purityCode: 'PLATINUM_PT950', purityName: 'PT950', multiplier: 0.95, isDefault: true },
  { metalType: 'PLATINUM', purityCode: 'PLATINUM_PT900', purityName: 'PT900', multiplier: 0.90 },
  
  // Palladium
  { metalType: 'PALLADIUM', purityCode: 'PALLADIUM_PD950', purityName: 'PD950', multiplier: 0.95, isDefault: true },
];

// ═══════════════════════════════════════════
// BASE METAL PRICE CONFIGURATIONS
// ═══════════════════════════════════════════

const BASE_METAL_PRICE_CONFIGS = [
  { metalCode: 'BRASS', basePriceUsd: 0.005, source: 'DEFAULT', isRestricted: false },
  { metalCode: 'BRONZE', basePriceUsd: 0.008, source: 'DEFAULT', isRestricted: false },
  { metalCode: 'COPPER', basePriceUsd: 0.008, source: 'MetalpriceAPI', isRestricted: false },
  { metalCode: 'ZINC', basePriceUsd: 0.003, source: 'DEFAULT', isRestricted: false },
  { metalCode: 'NICKEL', basePriceUsd: 0.018, source: 'DEFAULT', isRestricted: true }, // RESTRICTED - requires compliance flag
  { metalCode: 'GERMAN_SILVER', basePriceUsd: 0.012, source: 'DEFAULT', isRestricted: true }, // Contains nickel
  { metalCode: 'PEWTER', basePriceUsd: 0.015, source: 'DEFAULT', isRestricted: false },
  { metalCode: 'STAINLESS_STEEL', basePriceUsd: 0.002, source: 'DEFAULT', isRestricted: false },
  { metalCode: 'TITANIUM', basePriceUsd: 0.025, source: 'DEFAULT', isRestricted: false },
  { metalCode: 'TUNGSTEN', basePriceUsd: 0.035, source: 'DEFAULT', isRestricted: false },
];

// ═══════════════════════════════════════════
// TAX RULE CONFIGURATIONS
// ═══════════════════════════════════════════

const TAX_RULES = [
  // Nepal - 13% VAT
  { marketRegion: 'NP', taxName: 'VAT', category: 'ALL', rate: 0.13, displayName: 'VAT' },
  
  // India - 3% GST on gold/silver
  { marketRegion: 'IN', taxName: 'GST', category: 'PRECIOUS_METAL', rate: 0.03, displayName: 'GST' },
  { marketRegion: 'IN', taxName: 'GST', category: 'MAKING_CHARGE', rate: 0.05, displayName: 'GST' },
  { marketRegion: 'IN', taxName: 'GST', category: 'GEMSTONE', rate: 0.03, displayName: 'GST' },
  { marketRegion: 'IN', taxName: 'GST', category: 'FINISH', rate: 0.18, displayName: 'GST' },
  
  // UAE - 5% VAT
  { marketRegion: 'AE', taxName: 'VAT', category: 'ALL', rate: 0.05, displayName: 'VAT' },
  
  // UK - 20% VAT
  { marketRegion: 'UK', taxName: 'VAT', category: 'ALL', rate: 0.20, displayName: 'VAT' },
  
  // EU - 19% VAT (Germany default, varies by country)
  { marketRegion: 'EU', taxName: 'VAT', category: 'ALL', rate: 0.19, displayName: 'VAT' },
  
  // US - State sales tax (major states)
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.0, stateCode: 'DEFAULT', displayName: 'Sales Tax' }, // No federal tax
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.08875, stateCode: 'NY', displayName: 'NY Sales Tax' },
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.0725, stateCode: 'CA', displayName: 'CA Sales Tax' },
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.0625, stateCode: 'TX', displayName: 'TX Sales Tax' },
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.06, stateCode: 'FL', displayName: 'FL Sales Tax' },
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.10, stateCode: 'WA', displayName: 'WA Sales Tax' },
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.0, stateCode: 'OR', displayName: 'OR Sales Tax' }, // No sales tax
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.0, stateCode: 'MT', displayName: 'MT Sales Tax' }, // No sales tax
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.0, stateCode: 'NH', displayName: 'NH Sales Tax' }, // No sales tax
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.0, stateCode: 'DE', displayName: 'DE Sales Tax' }, // No sales tax
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.0663, stateCode: 'IL', displayName: 'IL Sales Tax' },
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.06, stateCode: 'PA', displayName: 'PA Sales Tax' },
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.08, stateCode: 'AZ', displayName: 'AZ Sales Tax' },
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.0725, stateCode: 'NV', displayName: 'NV Sales Tax' },
  { marketRegion: 'US', taxName: 'SALES_TAX', category: 'ALL', rate: 0.065, stateCode: 'MA', displayName: 'MA Sales Tax' },
];

// ═══════════════════════════════════════════
// MARKET ADJUSTMENT CONFIGURATIONS
// ═══════════════════════════════════════════

const MARKET_ADJUSTMENTS = [
  // Nepal - slight premium due to import costs
  { marketRegion: 'NP', category: 'ALL', adjustmentType: 'PERCENTAGE', adjustmentValue: 2, description: 'Regional import premium' },
  
  // India - competitive market, no adjustment
  { marketRegion: 'IN', category: 'ALL', adjustmentType: 'PERCENTAGE', adjustmentValue: 0, description: 'Base market rate' },
  
  // UAE - premium market
  { marketRegion: 'AE', category: 'PRECIOUS_METAL', adjustmentType: 'PERCENTAGE', adjustmentValue: 1, description: 'Premium market adjustment' },
  
  // UK - higher operational costs
  { marketRegion: 'UK', category: 'ALL', adjustmentType: 'PERCENTAGE', adjustmentValue: 3, description: 'Regional operational premium' },
  
  // EU - moderate premium
  { marketRegion: 'EU', category: 'ALL', adjustmentType: 'PERCENTAGE', adjustmentValue: 2, description: 'EU market adjustment' },
  
  // US - competitive, no adjustment
  { marketRegion: 'US', category: 'ALL', adjustmentType: 'PERCENTAGE', adjustmentValue: 0, description: 'Base market rate' },
];

// ═══════════════════════════════════════════
// FINISH PRICE CONFIGURATIONS
// ═══════════════════════════════════════════

const FINISH_PRICE_CONFIGS = [
  // Gold plating
  { finishType: 'GOLD_PLATING', tier: 'LIGHT', pricingModel: 'PER_GRAM', perGramRate: 0.5, basePrice: 5, percentageUplift: null },
  { finishType: 'GOLD_PLATING', tier: 'STANDARD', pricingModel: 'PER_GRAM', perGramRate: 1.0, basePrice: 10, percentageUplift: null },
  { finishType: 'GOLD_PLATING', tier: 'PREMIUM', pricingModel: 'PER_GRAM', perGramRate: 2.0, basePrice: 20, percentageUplift: null },
  
  // Rose gold plating
  { finishType: 'ROSE_GOLD_PLATING', tier: 'LIGHT', pricingModel: 'PER_GRAM', perGramRate: 0.5, basePrice: 5, percentageUplift: null },
  { finishType: 'ROSE_GOLD_PLATING', tier: 'STANDARD', pricingModel: 'PER_GRAM', perGramRate: 1.0, basePrice: 10, percentageUplift: null },
  { finishType: 'ROSE_GOLD_PLATING', tier: 'PREMIUM', pricingModel: 'PER_GRAM', perGramRate: 2.0, basePrice: 20, percentageUplift: null },
  
  // Vermeil (thick gold plating over sterling)
  { finishType: 'VERMEIL', tier: 'LIGHT', pricingModel: 'FIXED', perGramRate: null, basePrice: 15, percentageUplift: null },
  { finishType: 'VERMEIL', tier: 'STANDARD', pricingModel: 'FIXED', perGramRate: null, basePrice: 25, percentageUplift: null },
  { finishType: 'VERMEIL', tier: 'PREMIUM', pricingModel: 'FIXED', perGramRate: null, basePrice: 40, percentageUplift: null },
  
  // Rhodium plating
  { finishType: 'RHODIUM_PLATING', tier: 'LIGHT', pricingModel: 'FIXED', perGramRate: null, basePrice: 10, percentageUplift: null },
  { finishType: 'RHODIUM_PLATING', tier: 'STANDARD', pricingModel: 'FIXED', perGramRate: null, basePrice: 18, percentageUplift: null },
  { finishType: 'RHODIUM_PLATING', tier: 'PREMIUM', pricingModel: 'FIXED', perGramRate: null, basePrice: 30, percentageUplift: null },
  
  // PVD coating
  { finishType: 'PVD_COATING', tier: 'LIGHT', pricingModel: 'FIXED', perGramRate: null, basePrice: 8, percentageUplift: null },
  { finishType: 'PVD_COATING', tier: 'STANDARD', pricingModel: 'FIXED', perGramRate: null, basePrice: 15, percentageUplift: null },
  { finishType: 'PVD_COATING', tier: 'PREMIUM', pricingModel: 'FIXED', perGramRate: null, basePrice: 25, percentageUplift: null },
  
  // Silver plating
  { finishType: 'SILVER_PLATING', tier: 'LIGHT', pricingModel: 'PER_GRAM', perGramRate: 0.3, basePrice: 3, percentageUplift: null },
  { finishType: 'SILVER_PLATING', tier: 'STANDARD', pricingModel: 'PER_GRAM', perGramRate: 0.5, basePrice: 5, percentageUplift: null },
  { finishType: 'SILVER_PLATING', tier: 'PREMIUM', pricingModel: 'PER_GRAM', perGramRate: 1.0, basePrice: 10, percentageUplift: null },
  
  // Special finishes
  { finishType: 'OXIDIZED', tier: 'STANDARD', pricingModel: 'FIXED', perGramRate: null, basePrice: 5, percentageUplift: null },
  { finishType: 'MATTE', tier: 'STANDARD', pricingModel: 'FIXED', perGramRate: null, basePrice: 3, percentageUplift: null },
  { finishType: 'POLISHED', tier: 'STANDARD', pricingModel: 'FIXED', perGramRate: null, basePrice: 2, percentageUplift: null },
  { finishType: 'LACQUER', tier: 'STANDARD', pricingModel: 'FIXED', perGramRate: null, basePrice: 4, percentageUplift: null },
];

// ═══════════════════════════════════════════
// GEMSTONE PRICE CONFIGURATIONS
// ═══════════════════════════════════════════

const GEM_PRICE_CONFIGS = [
  // Diamonds - Natural
  { stoneType: 'DIAMOND_NATURAL', origin: 'NATURAL', qualityGrade: 'A', unit: 'CARAT', pricePerUnit: 5000, source: 'DEFAULT' },
  { stoneType: 'DIAMOND_NATURAL', origin: 'NATURAL', qualityGrade: 'PREMIUM', unit: 'CARAT', pricePerUnit: 5000, source: 'DEFAULT' },
  { stoneType: 'DIAMOND_NATURAL', origin: 'NATURAL', qualityGrade: 'B', unit: 'CARAT', pricePerUnit: 2000, source: 'DEFAULT' },
  { stoneType: 'DIAMOND_NATURAL', origin: 'NATURAL', qualityGrade: 'STANDARD', unit: 'CARAT', pricePerUnit: 2000, source: 'DEFAULT' },
  { stoneType: 'DIAMOND_NATURAL', origin: 'NATURAL', qualityGrade: 'C', unit: 'CARAT', pricePerUnit: 500, source: 'DEFAULT' },
  { stoneType: 'DIAMOND_NATURAL', origin: 'NATURAL', qualityGrade: 'BUDGET', unit: 'CARAT', pricePerUnit: 500, source: 'DEFAULT' },
  
  // Diamonds - Lab
  { stoneType: 'DIAMOND_LAB', origin: 'LAB', qualityGrade: 'A', unit: 'CARAT', pricePerUnit: 1000, source: 'DEFAULT' },
  { stoneType: 'DIAMOND_LAB', origin: 'LAB', qualityGrade: 'PREMIUM', unit: 'CARAT', pricePerUnit: 1000, source: 'DEFAULT' },
  { stoneType: 'DIAMOND_LAB', origin: 'LAB', qualityGrade: 'B', unit: 'CARAT', pricePerUnit: 500, source: 'DEFAULT' },
  { stoneType: 'DIAMOND_LAB', origin: 'LAB', qualityGrade: 'STANDARD', unit: 'CARAT', pricePerUnit: 500, source: 'DEFAULT' },
  { stoneType: 'DIAMOND_LAB', origin: 'LAB', qualityGrade: 'C', unit: 'CARAT', pricePerUnit: 200, source: 'DEFAULT' },
  { stoneType: 'DIAMOND_LAB', origin: 'LAB', qualityGrade: 'BUDGET', unit: 'CARAT', pricePerUnit: 200, source: 'DEFAULT' },
  
  // Moissanite
  { stoneType: 'MOISSANITE', origin: 'LAB', qualityGrade: 'A', unit: 'CARAT', pricePerUnit: 300, source: 'DEFAULT' },
  { stoneType: 'MOISSANITE', origin: 'LAB', qualityGrade: 'PREMIUM', unit: 'CARAT', pricePerUnit: 300, source: 'DEFAULT' },
  { stoneType: 'MOISSANITE', origin: 'LAB', qualityGrade: 'B', unit: 'CARAT', pricePerUnit: 200, source: 'DEFAULT' },
  { stoneType: 'MOISSANITE', origin: 'LAB', qualityGrade: 'STANDARD', unit: 'CARAT', pricePerUnit: 200, source: 'DEFAULT' },
  { stoneType: 'MOISSANITE', origin: 'LAB', qualityGrade: 'C', unit: 'CARAT', pricePerUnit: 100, source: 'DEFAULT' },
  { stoneType: 'MOISSANITE', origin: 'LAB', qualityGrade: 'BUDGET', unit: 'CARAT', pricePerUnit: 100, source: 'DEFAULT' },
  
  // Cubic Zirconia
  { stoneType: 'CUBIC_ZIRCONIA', origin: 'LAB', qualityGrade: 'A', unit: 'CARAT', pricePerUnit: 10, source: 'DEFAULT' },
  { stoneType: 'CUBIC_ZIRCONIA', origin: 'LAB', qualityGrade: 'PREMIUM', unit: 'CARAT', pricePerUnit: 10, source: 'DEFAULT' },
  { stoneType: 'CUBIC_ZIRCONIA', origin: 'LAB', qualityGrade: 'B', unit: 'CARAT', pricePerUnit: 5, source: 'DEFAULT' },
  { stoneType: 'CUBIC_ZIRCONIA', origin: 'LAB', qualityGrade: 'STANDARD', unit: 'CARAT', pricePerUnit: 5, source: 'DEFAULT' },
  { stoneType: 'CUBIC_ZIRCONIA', origin: 'LAB', qualityGrade: 'C', unit: 'CARAT', pricePerUnit: 2, source: 'DEFAULT' },
  { stoneType: 'CUBIC_ZIRCONIA', origin: 'LAB', qualityGrade: 'BUDGET', unit: 'CARAT', pricePerUnit: 2, source: 'DEFAULT' },
  
  // Ruby
  { stoneType: 'RUBY', origin: 'NATURAL', qualityGrade: 'A', unit: 'CARAT', pricePerUnit: 1000, source: 'DEFAULT' },
  { stoneType: 'RUBY', origin: 'NATURAL', qualityGrade: 'PREMIUM', unit: 'CARAT', pricePerUnit: 1000, source: 'DEFAULT' },
  { stoneType: 'RUBY', origin: 'NATURAL', qualityGrade: 'B', unit: 'CARAT', pricePerUnit: 500, source: 'DEFAULT' },
  { stoneType: 'RUBY', origin: 'NATURAL', qualityGrade: 'STANDARD', unit: 'CARAT', pricePerUnit: 500, source: 'DEFAULT' },
  { stoneType: 'RUBY', origin: 'NATURAL', qualityGrade: 'C', unit: 'CARAT', pricePerUnit: 200, source: 'DEFAULT' },
  { stoneType: 'RUBY', origin: 'NATURAL', qualityGrade: 'BUDGET', unit: 'CARAT', pricePerUnit: 200, source: 'DEFAULT' },
  
  // Sapphire
  { stoneType: 'SAPPHIRE', origin: 'NATURAL', qualityGrade: 'A', unit: 'CARAT', pricePerUnit: 800, source: 'DEFAULT' },
  { stoneType: 'SAPPHIRE', origin: 'NATURAL', qualityGrade: 'PREMIUM', unit: 'CARAT', pricePerUnit: 800, source: 'DEFAULT' },
  { stoneType: 'SAPPHIRE', origin: 'NATURAL', qualityGrade: 'B', unit: 'CARAT', pricePerUnit: 400, source: 'DEFAULT' },
  { stoneType: 'SAPPHIRE', origin: 'NATURAL', qualityGrade: 'STANDARD', unit: 'CARAT', pricePerUnit: 400, source: 'DEFAULT' },
  { stoneType: 'SAPPHIRE', origin: 'NATURAL', qualityGrade: 'C', unit: 'CARAT', pricePerUnit: 150, source: 'DEFAULT' },
  { stoneType: 'SAPPHIRE', origin: 'NATURAL', qualityGrade: 'BUDGET', unit: 'CARAT', pricePerUnit: 150, source: 'DEFAULT' },
  
  // Emerald
  { stoneType: 'EMERALD', origin: 'NATURAL', qualityGrade: 'A', unit: 'CARAT', pricePerUnit: 1200, source: 'DEFAULT' },
  { stoneType: 'EMERALD', origin: 'NATURAL', qualityGrade: 'PREMIUM', unit: 'CARAT', pricePerUnit: 1200, source: 'DEFAULT' },
  { stoneType: 'EMERALD', origin: 'NATURAL', qualityGrade: 'B', unit: 'CARAT', pricePerUnit: 600, source: 'DEFAULT' },
  { stoneType: 'EMERALD', origin: 'NATURAL', qualityGrade: 'STANDARD', unit: 'CARAT', pricePerUnit: 600, source: 'DEFAULT' },
  { stoneType: 'EMERALD', origin: 'NATURAL', qualityGrade: 'C', unit: 'CARAT', pricePerUnit: 250, source: 'DEFAULT' },
  { stoneType: 'EMERALD', origin: 'NATURAL', qualityGrade: 'BUDGET', unit: 'CARAT', pricePerUnit: 250, source: 'DEFAULT' },
  
  // Pearl
  { stoneType: 'PEARL', origin: 'NATURAL', qualityGrade: 'A', unit: 'PIECE', pricePerUnit: 200, source: 'DEFAULT' },
  { stoneType: 'PEARL', origin: 'NATURAL', qualityGrade: 'PREMIUM', unit: 'PIECE', pricePerUnit: 200, source: 'DEFAULT' },
  { stoneType: 'PEARL', origin: 'NATURAL', qualityGrade: 'B', unit: 'PIECE', pricePerUnit: 100, source: 'DEFAULT' },
  { stoneType: 'PEARL', origin: 'NATURAL', qualityGrade: 'STANDARD', unit: 'PIECE', pricePerUnit: 100, source: 'DEFAULT' },
  { stoneType: 'PEARL', origin: 'NATURAL', qualityGrade: 'C', unit: 'PIECE', pricePerUnit: 50, source: 'DEFAULT' },
  { stoneType: 'PEARL', origin: 'NATURAL', qualityGrade: 'BUDGET', unit: 'PIECE', pricePerUnit: 50, source: 'DEFAULT' },
];

// ═══════════════════════════════════════════
// ROUNDING RULE CONFIGURATIONS
// ═══════════════════════════════════════════

const ROUNDING_RULES = [
  { currencyCode: 'NPR', precision: 0, roundTo: 1, roundingStrategy: 'NEAREST' },
  { currencyCode: 'INR', precision: 0, roundTo: 1, roundingStrategy: 'NEAREST' },
  { currencyCode: 'AED', precision: 2, roundTo: 0.01, roundingStrategy: 'NEAREST' },
  { currencyCode: 'USD', precision: 2, roundTo: 0.01, roundingStrategy: 'NEAREST' },
  { currencyCode: 'GBP', precision: 2, roundTo: 0.01, roundingStrategy: 'NEAREST' },
  { currencyCode: 'EUR', precision: 2, roundTo: 0.01, roundingStrategy: 'NEAREST' },
];

// ═══════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════

async function seedPricingEngine() {
  console.log('🌱 Seeding pricing engine configuration...\n');

  // Seed metal purity configs
  console.log('📊 Seeding metal purity configurations...');
  for (const config of METAL_PURITY_CONFIGS) {
    await prisma.metalPurityConfig.upsert({
      where: { purityCode: config.purityCode },
      update: config,
      create: { ...config, isActive: true },
    });
  }
  console.log(`   ✓ ${METAL_PURITY_CONFIGS.length} metal purity configs seeded`);

  // Seed base metal prices
  console.log('🔩 Seeding base metal price configurations...');
  for (const config of BASE_METAL_PRICE_CONFIGS) {
    await prisma.baseMetalPriceConfig.upsert({
      where: { metalCode: config.metalCode },
      update: config,
      create: { ...config, isActive: true },
    });
  }
  console.log(`   ✓ ${BASE_METAL_PRICE_CONFIGS.length} base metal configs seeded`);

  // Seed tax rules
  console.log('💰 Seeding tax rule configurations...');
  for (const rule of TAX_RULES) {
    const existingRule = await prisma.taxRuleConfig.findFirst({
      where: {
        marketRegion: rule.marketRegion,
        taxName: rule.taxName,
        category: rule.category,
        stateCode: rule.stateCode || null,
      },
    });

    if (existingRule) {
      await prisma.taxRuleConfig.update({
        where: { id: existingRule.id },
        data: rule,
      });
    } else {
      await prisma.taxRuleConfig.create({
        data: { ...rule, isActive: true },
      });
    }
  }
  console.log(`   ✓ ${TAX_RULES.length} tax rules seeded`);

  // Seed market adjustments
  console.log('🌍 Seeding market adjustment configurations...');
  for (const adj of MARKET_ADJUSTMENTS) {
    const existingAdj = await prisma.marketAdjustmentConfig.findFirst({
      where: {
        marketRegion: adj.marketRegion,
        category: adj.category,
      },
    });

    if (existingAdj) {
      await prisma.marketAdjustmentConfig.update({
        where: { id: existingAdj.id },
        data: adj,
      });
    } else {
      await prisma.marketAdjustmentConfig.create({
        data: { ...adj, isActive: true },
      });
    }
  }
  console.log(`   ✓ ${MARKET_ADJUSTMENTS.length} market adjustments seeded`);

  // Seed finish prices
  console.log('✨ Seeding finish price configurations...');
  for (const config of FINISH_PRICE_CONFIGS) {
    const existingConfig = await prisma.finishPriceConfig.findFirst({
      where: {
        finishType: config.finishType,
        tier: config.tier,
      },
    });

    if (existingConfig) {
      await prisma.finishPriceConfig.update({
        where: { id: existingConfig.id },
        data: config,
      });
    } else {
      await prisma.finishPriceConfig.create({
        data: { ...config, isActive: true },
      });
    }
  }
  console.log(`   ✓ ${FINISH_PRICE_CONFIGS.length} finish price configs seeded`);

  // Seed gemstone prices
  console.log('💎 Seeding gemstone price configurations...');
  for (const config of GEM_PRICE_CONFIGS) {
    const existingConfig = await prisma.gemPriceConfig.findFirst({
      where: {
        stoneType: config.stoneType,
        origin: config.origin,
        qualityGrade: config.qualityGrade,
      },
    });

    if (existingConfig) {
      await prisma.gemPriceConfig.update({
        where: { id: existingConfig.id },
        data: config,
      });
    } else {
      await prisma.gemPriceConfig.create({
        data: { ...config, isActive: true },
      });
    }
  }
  console.log(`   ✓ ${GEM_PRICE_CONFIGS.length} gemstone price configs seeded`);

  // Seed rounding rules
  console.log('🔢 Seeding rounding rule configurations...');
  for (const config of ROUNDING_RULES) {
    await prisma.roundingRuleConfig.upsert({
      where: { currencyCode: config.currencyCode },
      update: config,
      create: { ...config, isActive: true },
    });
  }
  console.log(`   ✓ ${ROUNDING_RULES.length} rounding rules seeded`);

  console.log('\n✅ Pricing engine seed completed successfully!');
}

// Run seed
seedPricingEngine()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {
  METAL_PURITY_CONFIGS,
  BASE_METAL_PRICE_CONFIGS,
  TAX_RULES,
  MARKET_ADJUSTMENTS,
  FINISH_PRICE_CONFIGS,
  GEM_PRICE_CONFIGS,
  ROUNDING_RULES,
  seedPricingEngine,
};
