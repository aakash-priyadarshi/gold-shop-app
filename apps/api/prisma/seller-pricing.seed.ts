/**
 * Seller Pricing Seed Data
 * 
 * This file extends the main seed with comprehensive seller-specific pricing:
 * - Shop price overrides (metal rates, making charges)
 * - Shop gemstone pricing variations
 * - Shop finish pricing
 * - Multiple country/region shops for comparison testing
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════
// ADDITIONAL SHOPS FOR MULTI-REGION TESTING
// ═══════════════════════════════════════════

const ADDITIONAL_SHOPS = [
  // India - Mumbai shop
  {
    shopkeeper: {
      email: 'mumbai.jewels@test.com',
      firstName: 'Rahul',
      lastName: 'Jain',
      phone: '+919876543210',
    },
    shop: {
      shopName: 'Mumbai Gold & Diamonds',
      shopNameNe: 'मुम्बई गोल्ड एण्ड डायमण्ड्स',
      description: 'Premier diamond jewellery store with certified stones and competitive gold rates.',
      address: 'Zaveri Bazaar, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'IN',
      contactPhone: '+912222345678',
      makingChargePercent: 8,
      minOrderValueNpr: 10000,
    },
    metalRates: [
      { metalType: 'GOLD_24K', ratePerGramNpr: 6850 },
      { metalType: 'GOLD_22K', ratePerGramNpr: 6400 },
      { metalType: 'GOLD_18K', ratePerGramNpr: 5200 },
      { metalType: 'SILVER_999', ratePerGramNpr: 90 },
      { metalType: 'PLATINUM_950', ratePerGramNpr: 3800 },
    ],
    finishPricing: [
      { finishType: 'GOLD_PLATING', tier: 'STANDARD', priceNpr: 400 },
      { finishType: 'RHODIUM_PLATING', tier: 'STANDARD', priceNpr: 600 },
      { finishType: 'GOLD_PLATING', tier: 'PREMIUM', priceNpr: 800 },
    ],
    gemstonePricing: [
      { stoneType: 'DIAMOND_NATURAL', qualityGrade: 'PREMIUM', pricePerCaratNpr: 150000 },
      { stoneType: 'DIAMOND_NATURAL', qualityGrade: 'STANDARD', pricePerCaratNpr: 80000 },
      { stoneType: 'DIAMOND_LAB', qualityGrade: 'PREMIUM', pricePerCaratNpr: 30000 },
      { stoneType: 'RUBY', qualityGrade: 'PREMIUM', pricePerCaratNpr: 25000 },
      { stoneType: 'EMERALD', qualityGrade: 'PREMIUM', pricePerCaratNpr: 35000 },
    ],
  },

  // India - Delhi shop
  {
    shopkeeper: {
      email: 'delhi.gold@test.com',
      firstName: 'Vikram',
      lastName: 'Mittal',
      phone: '+919812345678',
    },
    shop: {
      shopName: 'Mittal Jewellers Delhi',
      shopNameNe: 'मित्तल ज्वेलर्स दिल्ली',
      description: 'Family-owned gold house with 50+ years of tradition. Specializing in bridal jewellery.',
      address: 'Karol Bagh, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'IN',
      contactPhone: '+911123456789',
      makingChargePercent: 10,
      minOrderValueNpr: 8000,
    },
    metalRates: [
      { metalType: 'GOLD_24K', ratePerGramNpr: 6900 },
      { metalType: 'GOLD_22K', ratePerGramNpr: 6450 },
      { metalType: 'GOLD_18K', ratePerGramNpr: 5300 },
      { metalType: 'SILVER_999', ratePerGramNpr: 92 },
    ],
    finishPricing: [
      { finishType: 'GOLD_PLATING', tier: 'LIGHT', priceNpr: 200 },
      { finishType: 'GOLD_PLATING', tier: 'STANDARD', priceNpr: 450 },
      { finishType: 'VERMEIL', tier: 'PREMIUM', priceNpr: 1800 },
      { finishType: 'MATTE', tier: 'STANDARD', priceNpr: 150 },
    ],
    gemstonePricing: [
      { stoneType: 'DIAMOND_NATURAL', qualityGrade: 'PREMIUM', pricePerCaratNpr: 145000 },
      { stoneType: 'MOISSANITE', qualityGrade: 'PREMIUM', pricePerCaratNpr: 8000 },
      { stoneType: 'SAPPHIRE', qualityGrade: 'PREMIUM', pricePerCaratNpr: 22000 },
    ],
  },

  // UAE - Dubai shop
  {
    shopkeeper: {
      email: 'dubai.gold@test.com',
      firstName: 'Ahmed',
      lastName: 'Al-Rashid',
      phone: '+971501234567',
    },
    shop: {
      shopName: 'Dubai Gold Souk Jewels',
      shopNameNe: 'दुबई गोल्ड सूक ज्वेल्स',
      description: 'Authentic Dubai gold with the finest craftsmanship. Tax-free shopping experience.',
      address: 'Gold Souk, Deira',
      city: 'Dubai',
      state: 'Dubai',
      country: 'AE',
      contactPhone: '+97142345678',
      makingChargePercent: 5,
      minOrderValueNpr: 25000,
    },
    metalRates: [
      { metalType: 'GOLD_24K', ratePerGramNpr: 7200 },
      { metalType: 'GOLD_22K', ratePerGramNpr: 6700 },
      { metalType: 'GOLD_18K', ratePerGramNpr: 5500 },
      { metalType: 'GOLD_14K', ratePerGramNpr: 4200 },
      { metalType: 'SILVER_999', ratePerGramNpr: 95 },
      { metalType: 'PLATINUM_950', ratePerGramNpr: 4000 },
    ],
    finishPricing: [
      { finishType: 'GOLD_PLATING', tier: 'PREMIUM', priceNpr: 1200 },
      { finishType: 'RHODIUM_PLATING', tier: 'PREMIUM', priceNpr: 1500 },
      { finishType: 'PVD_COATING', tier: 'STANDARD', priceNpr: 800 },
    ],
    gemstonePricing: [
      { stoneType: 'DIAMOND_NATURAL', qualityGrade: 'PREMIUM', pricePerCaratNpr: 180000 },
      { stoneType: 'DIAMOND_NATURAL', qualityGrade: 'STANDARD', pricePerCaratNpr: 95000 },
      { stoneType: 'DIAMOND_LAB', qualityGrade: 'PREMIUM', pricePerCaratNpr: 40000 },
      { stoneType: 'RUBY', qualityGrade: 'PREMIUM', pricePerCaratNpr: 35000 },
      { stoneType: 'SAPPHIRE', qualityGrade: 'PREMIUM', pricePerCaratNpr: 30000 },
      { stoneType: 'EMERALD', qualityGrade: 'PREMIUM', pricePerCaratNpr: 50000 },
    ],
  },

  // UK - London shop
  {
    shopkeeper: {
      email: 'london.jewellers@test.com',
      firstName: 'James',
      lastName: 'Sterling',
      phone: '+447912345678',
    },
    shop: {
      shopName: 'Hatton Garden Jewellers',
      shopNameNe: 'ह्याटन गार्डेन ज्वेलर्स',
      description: 'Traditional British craftsmanship meets modern design. Bespoke pieces from Hatton Garden.',
      address: '12 Hatton Garden',
      city: 'London',
      state: 'England',
      country: 'UK',
      contactPhone: '+442071234567',
      makingChargePercent: 15,
      minOrderValueNpr: 50000,
    },
    metalRates: [
      { metalType: 'GOLD_24K', ratePerGramNpr: 7800 },
      { metalType: 'GOLD_22K', ratePerGramNpr: 7300 },
      { metalType: 'GOLD_18K', ratePerGramNpr: 5900 },
      { metalType: 'GOLD_14K', ratePerGramNpr: 4600 },
      { metalType: 'SILVER_999', ratePerGramNpr: 105 },
      { metalType: 'SILVER_925', ratePerGramNpr: 100 },
      { metalType: 'PLATINUM_950', ratePerGramNpr: 4500 },
    ],
    finishPricing: [
      { finishType: 'GOLD_PLATING', tier: 'PREMIUM', priceNpr: 2500 },
      { finishType: 'RHODIUM_PLATING', tier: 'PREMIUM', priceNpr: 2800 },
      { finishType: 'VERMEIL', tier: 'PREMIUM', priceNpr: 3500 },
      { finishType: 'HAMMERED', tier: 'STANDARD', priceNpr: 1200 },
      { finishType: 'BRUSHED', tier: 'STANDARD', priceNpr: 800 },
    ],
    gemstonePricing: [
      { stoneType: 'DIAMOND_NATURAL', qualityGrade: 'PREMIUM', pricePerCaratNpr: 220000 },
      { stoneType: 'DIAMOND_NATURAL', qualityGrade: 'STANDARD', pricePerCaratNpr: 110000 },
      { stoneType: 'DIAMOND_LAB', qualityGrade: 'PREMIUM', pricePerCaratNpr: 45000 },
      { stoneType: 'SAPPHIRE', qualityGrade: 'PREMIUM', pricePerCaratNpr: 40000 },
    ],
  },

  // US - New York shop
  {
    shopkeeper: {
      email: 'ny.diamonds@test.com',
      firstName: 'Michael',
      lastName: 'Cohen',
      phone: '+12125551234',
    },
    shop: {
      shopName: 'Diamond District NYC',
      shopNameNe: 'डायमण्ड डिस्ट्रिक्ट एनवाईसी',
      description: 'Wholesale diamond prices on 47th Street. GIA certified stones only.',
      address: '47th Street Diamond District',
      city: 'New York',
      state: 'NY',
      country: 'US',
      contactPhone: '+12125551234',
      makingChargePercent: 12,
      minOrderValueNpr: 80000,
    },
    metalRates: [
      { metalType: 'GOLD_24K', ratePerGramNpr: 7500 },
      { metalType: 'GOLD_22K', ratePerGramNpr: 7000 },
      { metalType: 'GOLD_18K', ratePerGramNpr: 5700 },
      { metalType: 'GOLD_14K', ratePerGramNpr: 4400 },
      { metalType: 'GOLD_10K', ratePerGramNpr: 3200 },
      { metalType: 'SILVER_999', ratePerGramNpr: 100 },
      { metalType: 'PLATINUM_950', ratePerGramNpr: 4200 },
    ],
    finishPricing: [
      { finishType: 'RHODIUM_PLATING', tier: 'STANDARD', priceNpr: 1500 },
      { finishType: 'RHODIUM_PLATING', tier: 'PREMIUM', priceNpr: 2500 },
    ],
    gemstonePricing: [
      { stoneType: 'DIAMOND_NATURAL', qualityGrade: 'PREMIUM', pricePerCaratNpr: 200000 },
      { stoneType: 'DIAMOND_NATURAL', qualityGrade: 'STANDARD', pricePerCaratNpr: 100000 },
      { stoneType: 'DIAMOND_LAB', qualityGrade: 'PREMIUM', pricePerCaratNpr: 42000 },
      { stoneType: 'DIAMOND_LAB', qualityGrade: 'STANDARD', pricePerCaratNpr: 25000 },
      { stoneType: 'MOISSANITE', qualityGrade: 'PREMIUM', pricePerCaratNpr: 12000 },
    ],
  },

  // Nepal - Pokhara shop
  {
    shopkeeper: {
      email: 'pokhara.gold@test.com',
      firstName: 'Bishnu',
      lastName: 'Shrestha',
      phone: '+9779861234567',
    },
    shop: {
      shopName: 'Fewa Gold House',
      shopNameNe: 'फेवा गोल्ड हाउस',
      description: 'Pokhara\'s trusted gold jeweller. Family business since 1985.',
      address: 'Lakeside, Pokhara',
      city: 'Pokhara',
      state: 'Gandaki',
      country: 'NP',
      contactPhone: '+97761234567',
      makingChargePercent: 11,
      minOrderValueNpr: 4000,
    },
    metalRates: [
      { metalType: 'GOLD_24K', ratePerGramNpr: 11450 },
      { metalType: 'GOLD_22K', ratePerGramNpr: 10750 },
      { metalType: 'GOLD_18K', ratePerGramNpr: 8850 },
      { metalType: 'SILVER_999', ratePerGramNpr: 132 },
      { metalType: 'SILVER_925', ratePerGramNpr: 122 },
    ],
    finishPricing: [
      { finishType: 'GOLD_PLATING', tier: 'LIGHT', priceNpr: 300 },
      { finishType: 'GOLD_PLATING', tier: 'STANDARD', priceNpr: 600 },
      { finishType: 'MATTE', tier: 'STANDARD', priceNpr: 150 },
      { finishType: 'OXIDIZED', tier: 'STANDARD', priceNpr: 200 },
    ],
    gemstonePricing: [
      { stoneType: 'DIAMOND_NATURAL', qualityGrade: 'STANDARD', pricePerCaratNpr: 95000 },
      { stoneType: 'DIAMOND_LAB', qualityGrade: 'STANDARD', pricePerCaratNpr: 22000 },
      { stoneType: 'RUBY', qualityGrade: 'STANDARD', pricePerCaratNpr: 18000 },
      { stoneType: 'SAPPHIRE', qualityGrade: 'STANDARD', pricePerCaratNpr: 15000 },
      { stoneType: 'PEARL', qualityGrade: 'PREMIUM', pricePerCaratNpr: 500 },
    ],
  },

  // EU - Germany shop
  {
    shopkeeper: {
      email: 'berlin.schmuck@test.com',
      firstName: 'Hans',
      lastName: 'Mueller',
      phone: '+4915123456789',
    },
    shop: {
      shopName: 'Berlin Schmuck Atelier',
      shopNameNe: 'बर्लिन श्मुक एटेलियर',
      description: 'German precision craftsmanship. Eco-friendly and sustainable jewellery practices.',
      address: 'Ku\'damm, Berlin',
      city: 'Berlin',
      state: 'Berlin',
      country: 'EU',
      contactPhone: '+493012345678',
      makingChargePercent: 18,
      minOrderValueNpr: 60000,
    },
    metalRates: [
      { metalType: 'GOLD_18K', ratePerGramNpr: 6100 },
      { metalType: 'GOLD_14K', ratePerGramNpr: 4800 },
      { metalType: 'SILVER_925', ratePerGramNpr: 110 },
      { metalType: 'PLATINUM_950', ratePerGramNpr: 4600 },
    ],
    finishPricing: [
      { finishType: 'MATTE', tier: 'STANDARD', priceNpr: 400 },
      { finishType: 'BRUSHED', tier: 'STANDARD', priceNpr: 500 },
      { finishType: 'HAMMERED', tier: 'STANDARD', priceNpr: 700 },
      { finishType: 'SANDBLASTED', tier: 'STANDARD', priceNpr: 600 },
    ],
    gemstonePricing: [
      { stoneType: 'DIAMOND_LAB', qualityGrade: 'PREMIUM', pricePerCaratNpr: 48000 },
      { stoneType: 'MOISSANITE', qualityGrade: 'PREMIUM', pricePerCaratNpr: 14000 },
      { stoneType: 'SAPPHIRE', qualityGrade: 'PREMIUM', pricePerCaratNpr: 35000 },
      { stoneType: 'EMERALD', qualityGrade: 'PREMIUM', pricePerCaratNpr: 42000 },
    ],
  },
];

// ═══════════════════════════════════════════
// SHOP PRICE OVERRIDES FOR EXISTING SHOPS
// ═══════════════════════════════════════════

interface PriceOverride {
  overrideType: string;
  itemCode: string;
  overrideMode: 'FIXED' | 'PERCENTAGE' | 'MULTIPLIER';
  overrideValue: number;
}

const SHOP1_OVERRIDES: PriceOverride[] = [
  { overrideType: 'METAL_RATE', itemCode: 'GOLD_24K', overrideMode: 'FIXED', overrideValue: 11500 },
  { overrideType: 'METAL_RATE', itemCode: 'GOLD_22K', overrideMode: 'FIXED', overrideValue: 10800 },
  { overrideType: 'MAKING_CHARGE', itemCode: 'DEFAULT', overrideMode: 'PERCENTAGE', overrideValue: 12 },
  { overrideType: 'MAKING_CHARGE', itemCode: 'COMPLEX', overrideMode: 'PERCENTAGE', overrideValue: 15 },
  { overrideType: 'GEMSTONE', itemCode: 'DIAMOND_NATURAL_PREMIUM', overrideMode: 'FIXED', overrideValue: 160000 },
  { overrideType: 'GEMSTONE', itemCode: 'RUBY_PREMIUM', overrideMode: 'MULTIPLIER', overrideValue: 1.1 },
];

const SHOP2_OVERRIDES: PriceOverride[] = [
  { overrideType: 'METAL_RATE', itemCode: 'GOLD_22K', overrideMode: 'FIXED', overrideValue: 10700 },
  { overrideType: 'METAL_RATE', itemCode: 'GOLD_18K', overrideMode: 'FIXED', overrideValue: 8800 },
  { overrideType: 'MAKING_CHARGE', itemCode: 'DEFAULT', overrideMode: 'PERCENTAGE', overrideValue: 10 },
  { overrideType: 'FINISH', itemCode: 'RHODIUM_PLATING_STANDARD', overrideMode: 'FIXED', overrideValue: 800 },
  { overrideType: 'GEMSTONE', itemCode: 'DIAMOND_LAB_PREMIUM', overrideMode: 'FIXED', overrideValue: 28000 },
];

// ═══════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════

async function seedSellerPricing() {
  console.log('🌱 Seeding seller pricing data...\n');

  const shopkeeperPassword = await bcrypt.hash('shop123', 10);

  for (const shopData of ADDITIONAL_SHOPS) {
    console.log(`📦 Creating shop: ${shopData.shop.shopName}`);

    const shopkeeper = await prisma.user.upsert({
      where: { email: shopData.shopkeeper.email },
      update: {},
      create: {
        email: shopData.shopkeeper.email,
        firstName: shopData.shopkeeper.firstName,
        lastName: shopData.shopkeeper.lastName,
        phone: shopData.shopkeeper.phone,
        passwordHash: shopkeeperPassword,
        role: 'SHOPKEEPER',
        status: 'ACTIVE',
      },
    });

    const existingShop = await prisma.shop.findFirst({ where: { userId: shopkeeper.id } });
    const shop = existingShop || await prisma.shop.create({
      data: {
        userId: shopkeeper.id,
        shopName: shopData.shop.shopName,
        shopNameNe: shopData.shop.shopNameNe,
        description: shopData.shop.description,
        descriptionNe: shopData.shop.shopNameNe,
        address: shopData.shop.address,
        city: shopData.shop.city,
        state: shopData.shop.state,
        country: shopData.shop.country,
        contactPhone: shopData.shop.contactPhone,
        contactEmail: shopData.shopkeeper.email,
        isVerified: true,
        isActive: true,
        supportedJewelleryTypes: ['RING', 'NECKLACE', 'BANGLE', 'EARRING', 'CHAIN', 'PENDANT'],
        supportedMethods: ['METHOD_A', 'METHOD_B', 'METHOD_C', 'METHOD_D'],
        supportedMaterials: shopData.metalRates.map(r => r.metalType),
        supportedFinishes: shopData.finishPricing.map(f => f.finishType),
        makingChargePercent: shopData.shop.makingChargePercent,
        minOrderValueNpr: shopData.shop.minOrderValueNpr,
        acceptsComplexOrders: true,
        codEnabled: shopData.shop.country === 'NP',
        codMaxValueNpr: shopData.shop.country === 'NP' ? 100000 : 0,
      },
    });

    await prisma.shopMetalRate.createMany({
      skipDuplicates: true,
      data: shopData.metalRates.map(rate => ({
        shopId: shop.id,
        metalType: rate.metalType,
        ratePerGramNpr: rate.ratePerGramNpr,
      })),
    });

    await prisma.shopFinishPricing.createMany({
      skipDuplicates: true,
      data: shopData.finishPricing.map(finish => ({
        shopId: shop.id,
        finishType: finish.finishType,
        tier: finish.tier,
        priceNpr: finish.priceNpr,
      })),
    });

    // Note: Gemstone pricing uses the global GemstoneCatalog, not per-shop pricing
    // Per-shop gemstone pricing can be done via ShopPriceOverride

    console.log(`   ✓ Created shop with ${shopData.metalRates.length} metal rates, ${shopData.finishPricing.length} finishes`);
  }

  console.log('\n📊 Adding price overrides for existing shops...');

  const shop1 = await prisma.shop.findFirst({ where: { shopName: 'Ramesh Gold House' } });
  const shop2 = await prisma.shop.findFirst({ where: { shopName: 'Suna Jewellers' } });

  if (shop1) {
    for (const override of SHOP1_OVERRIDES) {
      await prisma.shopPriceOverride.upsert({
        where: {
          shopId_overrideType_itemCode: {
            shopId: shop1.id,
            overrideType: override.overrideType,
            itemCode: override.itemCode,
          },
        },
        update: override,
        create: {
          shopId: shop1.id,
          ...override,
          isActive: true,
        },
      });
    }
    console.log(`   ✓ Added ${SHOP1_OVERRIDES.length} overrides for Ramesh Gold House`);
  }

  if (shop2) {
    for (const override of SHOP2_OVERRIDES) {
      await prisma.shopPriceOverride.upsert({
        where: {
          shopId_overrideType_itemCode: {
            shopId: shop2.id,
            overrideType: override.overrideType,
            itemCode: override.itemCode,
          },
        },
        update: override,
        create: {
          shopId: shop2.id,
          ...override,
          isActive: true,
        },
      });
    }
    console.log(`   ✓ Added ${SHOP2_OVERRIDES.length} overrides for Suna Jewellers`);
  }

  console.log('\n✅ Seller pricing seed completed!');
}

seedSellerPricing()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedSellerPricing, ADDITIONAL_SHOPS };
