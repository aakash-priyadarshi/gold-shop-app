/**
 * Pricing Data Seed Script
 * Seeds realistic dummy data for materials, finishes, gemstones, and settings
 * 
 * Run with: npx ts-node prisma/seeds/pricing-seed.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════
// MATERIAL RATES (USD per gram with fabrication markup)
// ═══════════════════════════════════════════

const MATERIAL_RATES = [
  // Base metals with markup
  { materialCode: 'COPPER', ratePerGramUsd: 0.104, isRestricted: false, note: 'Copper ~$12k/ton × 8 markup' },
  { materialCode: 'ZINC', ratePerGramUsd: 0.0256, isRestricted: false, note: 'Zinc ~$3.2k/ton × 8 markup' },
  { materialCode: 'NICKEL', ratePerGramUsd: 0.14, isRestricted: true, note: 'Nickel ~$17.5k/ton × 8 markup - RESTRICTED' },
  
  // Alloys
  { materialCode: 'BRASS', ratePerGramUsd: 0.072, isRestricted: false, note: 'Copper+Zinc alloy × 8 markup' },
  { materialCode: 'BRONZE', ratePerGramUsd: 0.088, isRestricted: false, note: 'Copper+Tin alloy × 8 markup' },
  { materialCode: 'BRASS_ALLOY', ratePerGramUsd: 0.08, isRestricted: false, note: 'Brass jewellery alloy' },
  { materialCode: 'BRONZE_ALLOY', ratePerGramUsd: 0.096, isRestricted: false, note: 'Bronze jewellery alloy' },
  { materialCode: 'PALLADIUM_ALLOY', ratePerGramUsd: 0.64, isRestricted: false, note: 'Palladium alloy (lower Pd content)' },
  { materialCode: 'SILVER_ALLOY', ratePerGramUsd: 0.20, isRestricted: false, note: 'Silver alloy (lower Ag content)' },
  
  // Special metals with higher markup
  { materialCode: 'STAINLESS_STEEL_316L', ratePerGramUsd: 0.06, isRestricted: false, note: 'Medical grade stainless steel' },
  { materialCode: 'TITANIUM', ratePerGramUsd: 0.18, isRestricted: false, note: 'Titanium ~$15/kg × 12 markup' },
  { materialCode: 'TUNGSTEN_CARBIDE', ratePerGramUsd: 0.22, isRestricted: false, note: 'Industrial tungsten carbide' },
  { materialCode: 'COBALT_CHROME', ratePerGramUsd: 0.20, isRestricted: false, note: 'Medical/jewellery grade CoCr' },
];

// ═══════════════════════════════════════════
// FINISH PRICES (flat fee per piece in NPR)
// ═══════════════════════════════════════════

const FINISH_PRICES = [
  // Gold plating
  { finishType: 'GOLD_PLATING', tier: 'LIGHT', flatFee: 350, note: '0.5-1 micron' },
  { finishType: 'GOLD_PLATING', tier: 'STANDARD', flatFee: 650, note: '1-2.5 microns' },
  { finishType: 'GOLD_PLATING', tier: 'PREMIUM', flatFee: 1200, note: '2.5-5 microns' },
  
  // Rose gold plating
  { finishType: 'ROSE_GOLD_PLATING', tier: 'LIGHT', flatFee: 400, note: '0.5-1 micron' },
  { finishType: 'ROSE_GOLD_PLATING', tier: 'STANDARD', flatFee: 750, note: '1-2.5 microns' },
  { finishType: 'ROSE_GOLD_PLATING', tier: 'PREMIUM', flatFee: 1400, note: '2.5-5 microns' },
  
  // Vermeil (gold on sterling silver only)
  { finishType: 'VERMEIL', tier: 'LIGHT', flatFee: 800, note: 'Min 2.5μm on Sterling 925' },
  { finishType: 'VERMEIL', tier: 'STANDARD', flatFee: 1200, note: '3-4μm on Sterling 925' },
  { finishType: 'VERMEIL', tier: 'PREMIUM', flatFee: 2000, note: '5μm+ on Sterling 925' },
  
  // PVD coating
  { finishType: 'PVD_COATING', tier: 'LIGHT', flatFee: 500, note: 'Light PVD' },
  { finishType: 'PVD_COATING', tier: 'STANDARD', flatFee: 900, note: 'Standard PVD' },
  { finishType: 'PVD_COATING', tier: 'PREMIUM', flatFee: 1500, note: 'Premium PVD' },
  
  // Rhodium plating
  { finishType: 'RHODIUM_PLATING', tier: 'LIGHT', flatFee: 400, note: 'Light rhodium flash' },
  { finishType: 'RHODIUM_PLATING', tier: 'STANDARD', flatFee: 700, note: 'Standard rhodium' },
  { finishType: 'RHODIUM_PLATING', tier: 'PREMIUM', flatFee: 1200, note: 'Heavy rhodium' },
  
  // Silver plating
  { finishType: 'SILVER_PLATING', tier: 'LIGHT', flatFee: 200, note: 'Light silver' },
  { finishType: 'SILVER_PLATING', tier: 'STANDARD', flatFee: 350, note: 'Standard silver' },
  { finishType: 'SILVER_PLATING', tier: 'PREMIUM', flatFee: 600, note: 'Heavy silver' },
  
  // Oxidised finish
  { finishType: 'OXIDISED_FINISH', tier: 'LIGHT', flatFee: 150, note: 'Light oxidation' },
  { finishType: 'OXIDISED_FINISH', tier: 'STANDARD', flatFee: 250, note: 'Standard oxidation' },
  { finishType: 'OXIDISED_FINISH', tier: 'PREMIUM', flatFee: 400, note: 'Deep oxidation' },
  
  // Enamel coating
  { finishType: 'ENAMEL_COATING', tier: 'LIGHT', flatFee: 300, note: 'Simple enamel' },
  { finishType: 'ENAMEL_COATING', tier: 'STANDARD', flatFee: 550, note: 'Multi-color enamel' },
  { finishType: 'ENAMEL_COATING', tier: 'PREMIUM', flatFee: 900, note: 'Complex enamel work' },
];

// ═══════════════════════════════════════════
// GEMSTONE CATALOG (price per stone in NPR)
// ═══════════════════════════════════════════

const GEMSTONE_CATALOG = [
  // Cubic Zirconia (CZ) - Budget option
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 1, sizeMax: 2, qualityTier: 'BUDGET', pricePerStone: 15 },
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 1, sizeMax: 2, qualityTier: 'STANDARD', pricePerStone: 25 },
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 1, sizeMax: 2, qualityTier: 'PREMIUM', pricePerStone: 50 },
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 2, sizeMax: 4, qualityTier: 'BUDGET', pricePerStone: 30 },
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 2, sizeMax: 4, qualityTier: 'STANDARD', pricePerStone: 50 },
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 2, sizeMax: 4, qualityTier: 'PREMIUM', pricePerStone: 100 },
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 4, sizeMax: 6, qualityTier: 'BUDGET', pricePerStone: 60 },
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 4, sizeMax: 6, qualityTier: 'STANDARD', pricePerStone: 100 },
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 4, sizeMax: 6, qualityTier: 'PREMIUM', pricePerStone: 180 },
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 6, sizeMax: 8, qualityTier: 'BUDGET', pricePerStone: 120 },
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 6, sizeMax: 8, qualityTier: 'STANDARD', pricePerStone: 200 },
  { stoneType: 'CZ', sizeUnit: 'MM', sizeMin: 6, sizeMax: 8, qualityTier: 'PREMIUM', pricePerStone: 350 },
  
  // Moissanite - Mid-range option
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 1, sizeMax: 2, qualityTier: 'BUDGET', pricePerStone: 800 },
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 1, sizeMax: 2, qualityTier: 'STANDARD', pricePerStone: 1200 },
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 1, sizeMax: 2, qualityTier: 'PREMIUM', pricePerStone: 2000 },
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 2, sizeMax: 4, qualityTier: 'BUDGET', pricePerStone: 2500 },
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 2, sizeMax: 4, qualityTier: 'STANDARD', pricePerStone: 4000 },
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 2, sizeMax: 4, qualityTier: 'PREMIUM', pricePerStone: 6500 },
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 4, sizeMax: 6, qualityTier: 'BUDGET', pricePerStone: 6000 },
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 4, sizeMax: 6, qualityTier: 'STANDARD', pricePerStone: 10000 },
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 4, sizeMax: 6, qualityTier: 'PREMIUM', pricePerStone: 16000 },
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 6, sizeMax: 8, qualityTier: 'BUDGET', pricePerStone: 15000 },
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 6, sizeMax: 8, qualityTier: 'STANDARD', pricePerStone: 25000 },
  { stoneType: 'MOISSANITE', sizeUnit: 'MM', sizeMin: 6, sizeMax: 8, qualityTier: 'PREMIUM', pricePerStone: 40000 },
  
  // Natural Diamonds - Premium pricing by carat
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 0.1, sizeMax: 0.25, qualityTier: 'BUDGET', pricePerStone: 8000 },
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 0.1, sizeMax: 0.25, qualityTier: 'STANDARD', pricePerStone: 15000 },
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 0.1, sizeMax: 0.25, qualityTier: 'PREMIUM', pricePerStone: 30000 },
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 0.25, sizeMax: 0.5, qualityTier: 'BUDGET', pricePerStone: 25000 },
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 0.25, sizeMax: 0.5, qualityTier: 'STANDARD', pricePerStone: 50000 },
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 0.25, sizeMax: 0.5, qualityTier: 'PREMIUM', pricePerStone: 100000 },
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 0.5, sizeMax: 1, qualityTier: 'BUDGET', pricePerStone: 80000 },
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 0.5, sizeMax: 1, qualityTier: 'STANDARD', pricePerStone: 150000 },
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 0.5, sizeMax: 1, qualityTier: 'PREMIUM', pricePerStone: 350000 },
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 1, sizeMax: 2, qualityTier: 'BUDGET', pricePerStone: 200000 },
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 1, sizeMax: 2, qualityTier: 'STANDARD', pricePerStone: 450000 },
  { stoneType: 'DIAMOND', origin: 'NATURAL', sizeUnit: 'CARAT', sizeMin: 1, sizeMax: 2, qualityTier: 'PREMIUM', pricePerStone: 1000000 },
  
  // Lab Diamonds - ~35% of natural price
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 0.1, sizeMax: 0.25, qualityTier: 'BUDGET', pricePerStone: 2800 },
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 0.1, sizeMax: 0.25, qualityTier: 'STANDARD', pricePerStone: 5250 },
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 0.1, sizeMax: 0.25, qualityTier: 'PREMIUM', pricePerStone: 10500 },
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 0.25, sizeMax: 0.5, qualityTier: 'BUDGET', pricePerStone: 8750 },
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 0.25, sizeMax: 0.5, qualityTier: 'STANDARD', pricePerStone: 17500 },
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 0.25, sizeMax: 0.5, qualityTier: 'PREMIUM', pricePerStone: 35000 },
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 0.5, sizeMax: 1, qualityTier: 'BUDGET', pricePerStone: 28000 },
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 0.5, sizeMax: 1, qualityTier: 'STANDARD', pricePerStone: 52500 },
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 0.5, sizeMax: 1, qualityTier: 'PREMIUM', pricePerStone: 122500 },
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 1, sizeMax: 2, qualityTier: 'BUDGET', pricePerStone: 70000 },
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 1, sizeMax: 2, qualityTier: 'STANDARD', pricePerStone: 157500 },
  { stoneType: 'DIAMOND', origin: 'LAB', sizeUnit: 'CARAT', sizeMin: 1, sizeMax: 2, qualityTier: 'PREMIUM', pricePerStone: 350000 },
  
  // Ruby
  { stoneType: 'RUBY', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'BUDGET', pricePerStone: 500 },
  { stoneType: 'RUBY', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'STANDARD', pricePerStone: 1500 },
  { stoneType: 'RUBY', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'PREMIUM', pricePerStone: 4000 },
  { stoneType: 'RUBY', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'BUDGET', pricePerStone: 2000 },
  { stoneType: 'RUBY', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'STANDARD', pricePerStone: 6000 },
  { stoneType: 'RUBY', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'PREMIUM', pricePerStone: 15000 },
  { stoneType: 'RUBY', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'BUDGET', pricePerStone: 8000 },
  { stoneType: 'RUBY', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'STANDARD', pricePerStone: 25000 },
  { stoneType: 'RUBY', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'PREMIUM', pricePerStone: 60000 },
  
  // Sapphire
  { stoneType: 'SAPPHIRE', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'BUDGET', pricePerStone: 400 },
  { stoneType: 'SAPPHIRE', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'STANDARD', pricePerStone: 1200 },
  { stoneType: 'SAPPHIRE', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'PREMIUM', pricePerStone: 3500 },
  { stoneType: 'SAPPHIRE', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'BUDGET', pricePerStone: 1500 },
  { stoneType: 'SAPPHIRE', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'STANDARD', pricePerStone: 5000 },
  { stoneType: 'SAPPHIRE', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'PREMIUM', pricePerStone: 12000 },
  { stoneType: 'SAPPHIRE', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'BUDGET', pricePerStone: 6000 },
  { stoneType: 'SAPPHIRE', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'STANDARD', pricePerStone: 20000 },
  { stoneType: 'SAPPHIRE', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'PREMIUM', pricePerStone: 50000 },
  
  // Emerald
  { stoneType: 'EMERALD', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'BUDGET', pricePerStone: 600 },
  { stoneType: 'EMERALD', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'STANDARD', pricePerStone: 2000 },
  { stoneType: 'EMERALD', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'PREMIUM', pricePerStone: 5000 },
  { stoneType: 'EMERALD', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'BUDGET', pricePerStone: 3000 },
  { stoneType: 'EMERALD', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'STANDARD', pricePerStone: 8000 },
  { stoneType: 'EMERALD', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'PREMIUM', pricePerStone: 20000 },
  { stoneType: 'EMERALD', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'BUDGET', pricePerStone: 12000 },
  { stoneType: 'EMERALD', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'STANDARD', pricePerStone: 35000 },
  { stoneType: 'EMERALD', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'PREMIUM', pricePerStone: 80000 },
  
  // Pearl
  { stoneType: 'PEARL', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'BUDGET', pricePerStone: 200 },
  { stoneType: 'PEARL', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'STANDARD', pricePerStone: 500 },
  { stoneType: 'PEARL', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'PREMIUM', pricePerStone: 1200 },
  { stoneType: 'PEARL', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'BUDGET', pricePerStone: 500 },
  { stoneType: 'PEARL', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'STANDARD', pricePerStone: 1200 },
  { stoneType: 'PEARL', sizeUnit: 'MM', sizeMin: 5, sizeMax: 7, qualityTier: 'PREMIUM', pricePerStone: 3000 },
  { stoneType: 'PEARL', sizeUnit: 'MM', sizeMin: 7, sizeMax: 10, qualityTier: 'BUDGET', pricePerStone: 1200 },
  { stoneType: 'PEARL', sizeUnit: 'MM', sizeMin: 7, sizeMax: 10, qualityTier: 'STANDARD', pricePerStone: 3000 },
  { stoneType: 'PEARL', sizeUnit: 'MM', sizeMin: 7, sizeMax: 10, qualityTier: 'PREMIUM', pricePerStone: 8000 },
  
  // Semi-precious stones
  { stoneType: 'SEMI_PRECIOUS', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'BUDGET', pricePerStone: 50 },
  { stoneType: 'SEMI_PRECIOUS', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'STANDARD', pricePerStone: 100 },
  { stoneType: 'SEMI_PRECIOUS', sizeUnit: 'MM', sizeMin: 1, sizeMax: 3, qualityTier: 'PREMIUM', pricePerStone: 250 },
  { stoneType: 'SEMI_PRECIOUS', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'BUDGET', pricePerStone: 100 },
  { stoneType: 'SEMI_PRECIOUS', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'STANDARD', pricePerStone: 250 },
  { stoneType: 'SEMI_PRECIOUS', sizeUnit: 'MM', sizeMin: 3, sizeMax: 5, qualityTier: 'PREMIUM', pricePerStone: 600 },
  { stoneType: 'SEMI_PRECIOUS', sizeUnit: 'MM', sizeMin: 5, sizeMax: 8, qualityTier: 'BUDGET', pricePerStone: 250 },
  { stoneType: 'SEMI_PRECIOUS', sizeUnit: 'MM', sizeMin: 5, sizeMax: 8, qualityTier: 'STANDARD', pricePerStone: 600 },
  { stoneType: 'SEMI_PRECIOUS', sizeUnit: 'MM', sizeMin: 5, sizeMax: 8, qualityTier: 'PREMIUM', pricePerStone: 1500 },
];

// ═══════════════════════════════════════════
// SETTING PRICES (per stone in NPR)
// ═══════════════════════════════════════════

const SETTING_PRICES = [
  { settingType: 'PRONG', flatFeePerStone: 150, note: 'Classic prong setting' },
  { settingType: 'BEZEL', flatFeePerStone: 250, note: 'Full bezel setting' },
  { settingType: 'PAVE', flatFeePerStone: 100, note: 'Per stone in pave' },
  { settingType: 'CHANNEL', flatFeePerStone: 180, note: 'Channel setting' },
  { settingType: 'HALO', flatFeePerStone: 350, note: 'Halo setting with accent stones' },
  { settingType: 'FLUSH', flatFeePerStone: 200, note: 'Flush/gypsy setting' },
  { settingType: 'TENSION', flatFeePerStone: 400, note: 'Tension setting' },
];

// FX rate for NPR -> INR conversion (NPR / 1.60 = INR)
const INR_NPR_RATIO = 1.60;

async function seedPricingData() {
  console.log('🌱 Starting pricing data seed...\n');

  // Seed Material Rates for both currencies
  console.log('📦 Seeding material rates...');
  for (const material of MATERIAL_RATES) {
    const nprRate = material.ratePerGramUsd * 133.60; // USD to NPR
    const inrRate = material.ratePerGramUsd * 83.50;  // USD to INR
    
    // NPR rate
    await prisma.materialRate.upsert({
      where: { materialCode_currency: { materialCode: material.materialCode, currency: 'NPR' } },
      update: {
        ratePerGramUsd: material.ratePerGramUsd,
        ratePerGramLocal: parseFloat(nprRate.toFixed(2)),
        isRestricted: material.isRestricted,
        note: material.note,
        source: 'seed',
      },
      create: {
        materialCode: material.materialCode,
        ratePerGramUsd: material.ratePerGramUsd,
        ratePerGramLocal: parseFloat(nprRate.toFixed(2)),
        currency: 'NPR',
        isRestricted: material.isRestricted,
        note: material.note,
        source: 'seed',
      },
    });
    
    // INR rate
    await prisma.materialRate.upsert({
      where: { materialCode_currency: { materialCode: material.materialCode, currency: 'INR' } },
      update: {
        ratePerGramUsd: material.ratePerGramUsd,
        ratePerGramLocal: parseFloat(inrRate.toFixed(2)),
        isRestricted: material.isRestricted,
        note: material.note,
        source: 'seed',
      },
      create: {
        materialCode: material.materialCode,
        ratePerGramUsd: material.ratePerGramUsd,
        ratePerGramLocal: parseFloat(inrRate.toFixed(2)),
        currency: 'INR',
        isRestricted: material.isRestricted,
        note: material.note,
        source: 'seed',
      },
    });
  }
  console.log(`  ✅ Seeded ${MATERIAL_RATES.length * 2} material rates (NPR + INR)\n`);

  // Seed Finish Prices for both currencies
  console.log('🎨 Seeding finish prices...');
  for (const finish of FINISH_PRICES) {
    const inrFee = parseFloat((finish.flatFee / INR_NPR_RATIO).toFixed(2));
    
    // NPR price
    await prisma.finishPrice.upsert({
      where: { finishType_tier_currency: { finishType: finish.finishType, tier: finish.tier, currency: 'NPR' } },
      update: {
        flatFee: finish.flatFee,
        note: finish.note,
        source: 'seed',
      },
      create: {
        finishType: finish.finishType,
        tier: finish.tier,
        flatFee: finish.flatFee,
        currency: 'NPR',
        note: finish.note,
        source: 'seed',
      },
    });
    
    // INR price
    await prisma.finishPrice.upsert({
      where: { finishType_tier_currency: { finishType: finish.finishType, tier: finish.tier, currency: 'INR' } },
      update: {
        flatFee: inrFee,
        note: finish.note,
        source: 'seed',
      },
      create: {
        finishType: finish.finishType,
        tier: finish.tier,
        flatFee: inrFee,
        currency: 'INR',
        note: finish.note,
        source: 'seed',
      },
    });
  }
  console.log(`  ✅ Seeded ${FINISH_PRICES.length * 2} finish prices (NPR + INR)\n`);

  // Seed Gemstone Catalog for both currencies
  console.log('💎 Seeding gemstone catalog...');
  for (const gem of GEMSTONE_CATALOG) {
    const inrPrice = parseFloat((gem.pricePerStone / INR_NPR_RATIO).toFixed(2));
    
    // NPR price
    await prisma.gemstoneCatalog.create({
      data: {
        stoneType: gem.stoneType,
        origin: gem.origin,
        sizeUnit: gem.sizeUnit,
        sizeMin: gem.sizeMin,
        sizeMax: gem.sizeMax,
        qualityTier: gem.qualityTier,
        pricePerStone: gem.pricePerStone,
        currency: 'NPR',
        source: 'seed',
      },
    });
    
    // INR price
    await prisma.gemstoneCatalog.create({
      data: {
        stoneType: gem.stoneType,
        origin: gem.origin,
        sizeUnit: gem.sizeUnit,
        sizeMin: gem.sizeMin,
        sizeMax: gem.sizeMax,
        qualityTier: gem.qualityTier,
        pricePerStone: inrPrice,
        currency: 'INR',
        source: 'seed',
      },
    });
  }
  console.log(`  ✅ Seeded ${GEMSTONE_CATALOG.length * 2} gemstone catalog entries (NPR + INR)\n`);

  // Seed Setting Prices for both currencies
  console.log('⚙️ Seeding setting prices...');
  for (const setting of SETTING_PRICES) {
    const inrFee = parseFloat((setting.flatFeePerStone / INR_NPR_RATIO).toFixed(2));
    
    // NPR price
    await prisma.settingPrice.upsert({
      where: { settingType_currency: { settingType: setting.settingType, currency: 'NPR' } },
      update: {
        flatFeePerStone: setting.flatFeePerStone,
        note: setting.note,
        source: 'seed',
      },
      create: {
        settingType: setting.settingType,
        flatFeePerStone: setting.flatFeePerStone,
        currency: 'NPR',
        note: setting.note,
        source: 'seed',
      },
    });
    
    // INR price
    await prisma.settingPrice.upsert({
      where: { settingType_currency: { settingType: setting.settingType, currency: 'INR' } },
      update: {
        flatFeePerStone: inrFee,
        note: setting.note,
        source: 'seed',
      },
      create: {
        settingType: setting.settingType,
        flatFeePerStone: inrFee,
        currency: 'INR',
        note: setting.note,
        source: 'seed',
      },
    });
  }
  console.log(`  ✅ Seeded ${SETTING_PRICES.length * 2} setting prices (NPR + INR)\n`);

  console.log('🎉 Pricing data seed completed!\n');
  console.log('Summary:');
  console.log(`  - Material rates: ${MATERIAL_RATES.length * 2}`);
  console.log(`  - Finish prices: ${FINISH_PRICES.length * 2}`);
  console.log(`  - Gemstone entries: ${GEMSTONE_CATALOG.length * 2}`);
  console.log(`  - Setting prices: ${SETTING_PRICES.length * 2}`);
}

async function main() {
  try {
    await seedPricingData();
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
