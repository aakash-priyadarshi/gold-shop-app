import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@goldshop.com' },
    update: {},
    create: {
      email: 'admin@goldshop.com',
      firstName: 'System',
      lastName: 'Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create test customers
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      firstName: 'Test',
      lastName: 'Customer',
      phone: '+9779801234567',
      passwordHash: customerPassword,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created test customer:', customer.email);

  // Create additional test customers for testing
  const customer2 = await prisma.user.upsert({
    where: { email: 'sita@test.com' },
    update: {},
    create: {
      email: 'sita@test.com',
      firstName: 'Sita',
      lastName: 'Sharma',
      phone: '+9779812345678',
      passwordHash: customerPassword,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created customer:', customer2.email);

  const customer3 = await prisma.user.upsert({
    where: { email: 'raj@test.com' },
    update: {},
    create: {
      email: 'raj@test.com',
      firstName: 'Raj',
      lastName: 'Thapa',
      phone: '+9779823456789',
      passwordHash: customerPassword,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created customer:', customer3.email);

  // Create shopkeeper 1
  const shopkeeper1Password = await bcrypt.hash('shop123', 10);
  const shopkeeper1 = await prisma.user.upsert({
    where: { email: 'rameshgold@test.com' },
    update: {},
    create: {
      email: 'rameshgold@test.com',
      firstName: 'Ramesh',
      lastName: 'Sunar',
      phone: '+9779841234567',
      passwordHash: shopkeeper1Password,
      role: 'SHOPKEEPER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created shopkeeper 1:', shopkeeper1.email);

  // Create Shop 1 - Ramesh Gold House
  const shop1 = await prisma.shop.upsert({
    where: { userId: shopkeeper1.id },
    update: {},
    create: {
      userId: shopkeeper1.id,
      shopName: 'Ramesh Gold House',
      shopNameNe: 'रमेश गोल्ड हाउस',
      description: 'Premium gold jewellery crafted with generations of expertise. Specializing in traditional Nepali designs and modern pieces.',
      descriptionNe: 'पुस्तौं देखिको विशेषज्ञताले निर्मित प्रिमियम सुनको गहना। परम्परागत नेपाली डिजाइन र आधुनिक टुक्राहरूमा विशेषज्ञता।',
      address: 'New Road, Kathmandu',
      city: 'Kathmandu',
      state: 'Bagmati',
      country: 'NP',
      contactPhone: '+97714234567',
      contactEmail: 'rameshgold@test.com',
      isVerified: true,
      isActive: true,
      supportedJewelleryTypes: ['RING', 'NECKLACE', 'BANGLE', 'EARRING', 'CHAIN', 'PENDANT', 'MANGALSUTRA'],
      supportedMethods: ['METHOD_A', 'METHOD_B', 'METHOD_D'],
      supportedMaterials: ['GOLD_24K', 'GOLD_22K', 'GOLD_18K', 'SILVER_999'],
      supportedFinishes: ['POLISH', 'MATTE', 'ANTIQUE'],
      makingChargePercent: 12,
      minOrderValueNpr: 5000,
      acceptsComplexOrders: true,
      codEnabled: true,
      codMaxValueNpr: 100000,
    },
  });
  console.log('✅ Created shop:', shop1.shopName);

  // Shop 1 Metal Rates
  await prisma.shopMetalRate.createMany({
    skipDuplicates: true,
    data: [
      {
        shopId: shop1.id,
        metalType: 'GOLD_24K',
        ratePerGramNpr: 11500,
      },
      {
        shopId: shop1.id,
        metalType: 'GOLD_22K',
        ratePerGramNpr: 10800,
      },
      {
        shopId: shop1.id,
        metalType: 'GOLD_18K',
        ratePerGramNpr: 8900,
      },
      {
        shopId: shop1.id,
        metalType: 'SILVER_999',
        ratePerGramNpr: 135,
      },
    ],
  });
  console.log('✅ Created metal rates for shop 1');

  // Create shopkeeper 2
  const shopkeeper2Password = await bcrypt.hash('shop123', 10);
  const shopkeeper2 = await prisma.user.upsert({
    where: { email: 'sunajewellers@test.com' },
    update: {},
    create: {
      email: 'sunajewellers@test.com',
      firstName: 'Sunita',
      lastName: 'Shakya',
      phone: '+9779851234567',
      passwordHash: shopkeeper2Password,
      role: 'SHOPKEEPER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created shopkeeper 2:', shopkeeper2.email);

  // Create Shop 2 - Suna Jewellers
  const shop2 = await prisma.shop.upsert({
    where: { userId: shopkeeper2.id },
    update: {},
    create: {
      userId: shopkeeper2.id,
      shopName: 'Suna Jewellers',
      shopNameNe: 'सुन ज्वेलर्स',
      description: 'Modern designs at competitive prices. Quick turnaround on custom orders.',
      descriptionNe: 'प्रतिस्पर्धी मूल्यमा आधुनिक डिजाइनहरू। आदेशहरूमा छिटो काम।',
      address: 'Thamel, Kathmandu',
      city: 'Kathmandu',
      state: 'Bagmati',
      country: 'NP',
      contactPhone: '+97714234568',
      contactEmail: 'sunajewellers@test.com',
      isVerified: true,
      isActive: true,
      supportedJewelleryTypes: ['RING', 'NECKLACE', 'BRACELET', 'EARRING', 'CHAIN'],
      supportedMethods: ['METHOD_A', 'METHOD_B', 'METHOD_C'],
      supportedMaterials: ['GOLD_22K', 'GOLD_18K', 'SILVER_925', 'PLATINUM_950'],
      supportedFinishes: ['POLISH', 'RHODIUM_PLATING'],
      makingChargePercent: 10,
      minOrderValueNpr: 3000,
      acceptsComplexOrders: true,
      codEnabled: true,
      codMaxValueNpr: 50000,
    },
  });
  console.log('✅ Created shop:', shop2.shopName);

  // Shop 2 Metal Rates (More competitive)
  await prisma.shopMetalRate.createMany({
    skipDuplicates: true,
    data: [
      {
        shopId: shop2.id,
        metalType: 'GOLD_22K',
        ratePerGramNpr: 10700,
      },
      {
        shopId: shop2.id,
        metalType: 'GOLD_18K',
        ratePerGramNpr: 8800,
      },
      {
        shopId: shop2.id,
        metalType: 'SILVER_925',
        ratePerGramNpr: 120,
      },
      {
        shopId: shop2.id,
        metalType: 'PLATINUM_950',
        ratePerGramNpr: 4200,
      },
    ],
  });
  console.log('✅ Created metal rates for shop 2');

  // Shop 2 Finish Pricing
  await prisma.shopFinishPricing.createMany({
    skipDuplicates: true,
    data: [
      { shopId: shop2.id, finishType: 'GOLD_PLATING', tier: 'LIGHT', priceNpr: 500 },
      { shopId: shop2.id, finishType: 'GOLD_PLATING', tier: 'STANDARD', priceNpr: 1000 },
      { shopId: shop2.id, finishType: 'GOLD_PLATING', tier: 'PREMIUM', priceNpr: 2000 },
      { shopId: shop2.id, finishType: 'RHODIUM_PLATING', tier: 'STANDARD', priceNpr: 800 },
    ],
  });
  console.log('✅ Created finish pricing for shop 2');

  // ══════════════════════════════════════
  // MARKET RATES (Fallback reference prices)
  // ══════════════════════════════════════
  await prisma.marketRate.createMany({
    skipDuplicates: true,
    data: [
      { metalCode: 'GOLD_24K', country: 'NP', ratePerGram: 11400, source: 'NEPAL_RASTRA_BANK' },
      { metalCode: 'GOLD_22K', country: 'NP', ratePerGram: 10700, source: 'NEPAL_RASTRA_BANK' },
      { metalCode: 'GOLD_18K', country: 'NP', ratePerGram: 8800, source: 'CALCULATED' },
      { metalCode: 'GOLD_14K', country: 'NP', ratePerGram: 6800, source: 'CALCULATED' },
      { metalCode: 'SILVER_999', country: 'NP', ratePerGram: 130, source: 'NEPAL_RASTRA_BANK' },
      { metalCode: 'SILVER_925', country: 'NP', ratePerGram: 120, source: 'CALCULATED' },
      { metalCode: 'PLATINUM_950', country: 'NP', ratePerGram: 4100, source: 'INTERNATIONAL' },
      { metalCode: 'BRASS', country: 'NP', ratePerGram: 1.5, source: 'LOCAL_MARKET' },
      { metalCode: 'COPPER', country: 'NP', ratePerGram: 1.2, source: 'LOCAL_MARKET' },
      { metalCode: 'STAINLESS_STEEL_316L', country: 'NP', ratePerGram: 0.5, source: 'LOCAL_MARKET' },
    ],
  });
  console.log('✅ Created market rates');

  // ══════════════════════════════════════
  // JEWELLERY TEMPLATES
  // ══════════════════════════════════════
  const ringTemplate1 = await prisma.jewelleryTemplate.upsert({
    where: { jewelleryType_nameEn: { jewelleryType: 'RING', nameEn: 'Classic Solitaire Ring' } },
    update: {},
    create: {
      jewelleryType: 'RING',
      nameEn: 'Classic Solitaire Ring',
      nameNe: 'क्लासिक सोलिटेर औंठी',
      descriptionEn: 'Timeless single-stone ring design perfect for engagement or everyday wear',
      lightWeightMin: 2.0,
      lightWeightMax: 3.5,
      mediumWeightMin: 3.5,
      mediumWeightMax: 5.5,
      heavyWeightMin: 5.5,
      heavyWeightMax: 10.0,
      defaultDimensions: { bandWidth: 2.5, bandThickness: 1.8, settingHeight: 6.0 },
      recommendedMaterials: ['GOLD_18K', 'GOLD_22K', 'PLATINUM_950'],
      iconName: 'ring-solitaire',
      sortOrder: 1,
    },
  });

  const ringTemplate2 = await prisma.jewelleryTemplate.upsert({
    where: { jewelleryType_nameEn: { jewelleryType: 'RING', nameEn: 'Band Ring' } },
    update: {},
    create: {
      jewelleryType: 'RING',
      nameEn: 'Band Ring',
      nameNe: 'ब्यान्ड औंठी',
      descriptionEn: 'Simple elegant band ring, perfect for wedding bands or stacking',
      lightWeightMin: 1.5,
      lightWeightMax: 2.5,
      mediumWeightMin: 2.5,
      mediumWeightMax: 4.0,
      heavyWeightMin: 4.0,
      heavyWeightMax: 8.0,
      defaultDimensions: { bandWidth: 4.0, bandThickness: 1.5 },
      recommendedMaterials: ['GOLD_22K', 'GOLD_18K', 'SILVER_925'],
      iconName: 'ring-band',
      sortOrder: 2,
    },
  });

  const necklaceTemplate = await prisma.jewelleryTemplate.upsert({
    where: { jewelleryType_nameEn: { jewelleryType: 'NECKLACE', nameEn: 'Traditional Necklace Set' } },
    update: {},
    create: {
      jewelleryType: 'NECKLACE',
      nameEn: 'Traditional Necklace Set',
      nameNe: 'परम्परागत हार सेट',
      descriptionEn: 'Classic Nepali bridal necklace with intricate traditional patterns',
      lightWeightMin: 15.0,
      lightWeightMax: 25.0,
      mediumWeightMin: 25.0,
      mediumWeightMax: 40.0,
      heavyWeightMin: 40.0,
      heavyWeightMax: 80.0,
      defaultDimensions: { length: 450, pendantWidth: 40, pendantHeight: 50 },
      recommendedMaterials: ['GOLD_22K', 'GOLD_24K'],
      iconName: 'necklace-traditional',
      sortOrder: 1,
    },
  });

  const pendantTemplate = await prisma.jewelleryTemplate.upsert({
    where: { jewelleryType_nameEn: { jewelleryType: 'PENDANT', nameEn: 'Modern Pendant' } },
    update: {},
    create: {
      jewelleryType: 'PENDANT',
      nameEn: 'Modern Pendant',
      nameNe: 'आधुनिक पेन्डेन्ट',
      descriptionEn: 'Contemporary pendant design suitable for casual and formal wear',
      lightWeightMin: 1.5,
      lightWeightMax: 3.0,
      mediumWeightMin: 3.0,
      mediumWeightMax: 5.0,
      heavyWeightMin: 5.0,
      heavyWeightMax: 12.0,
      defaultDimensions: { width: 15, height: 20, thickness: 3 },
      recommendedMaterials: ['GOLD_18K', 'SILVER_925'],
      iconName: 'pendant-modern',
      sortOrder: 1,
    },
  });

  const earringTemplate = await prisma.jewelleryTemplate.upsert({
    where: { jewelleryType_nameEn: { jewelleryType: 'EARRING', nameEn: 'Stud Earrings' } },
    update: {},
    create: {
      jewelleryType: 'EARRING',
      nameEn: 'Stud Earrings',
      nameNe: 'स्टड कानको झुम्का',
      descriptionEn: 'Classic stud earrings, versatile for all occasions',
      lightWeightMin: 1.0,
      lightWeightMax: 2.0,
      mediumWeightMin: 2.0,
      mediumWeightMax: 3.5,
      heavyWeightMin: 3.5,
      heavyWeightMax: 6.0,
      defaultDimensions: { diameter: 6, postLength: 10 },
      recommendedMaterials: ['GOLD_18K', 'GOLD_22K', 'PLATINUM_950'],
      iconName: 'earring-stud',
      sortOrder: 1,
    },
  });

  const bangleTemplate = await prisma.jewelleryTemplate.upsert({
    where: { jewelleryType_nameEn: { jewelleryType: 'BANGLE', nameEn: 'Traditional Bangle' } },
    update: {},
    create: {
      jewelleryType: 'BANGLE',
      nameEn: 'Traditional Bangle',
      nameNe: 'परम्परागत चुरा',
      descriptionEn: 'Classic round bangle with traditional Nepali design',
      lightWeightMin: 8.0,
      lightWeightMax: 15.0,
      mediumWeightMin: 15.0,
      mediumWeightMax: 25.0,
      heavyWeightMin: 25.0,
      heavyWeightMax: 50.0,
      defaultDimensions: { innerDiameter: 65, width: 8, thickness: 3 },
      recommendedMaterials: ['GOLD_22K', 'GOLD_24K'],
      iconName: 'bangle-traditional',
      sortOrder: 1,
    },
  });

  const braceletTemplate = await prisma.jewelleryTemplate.upsert({
    where: { jewelleryType_nameEn: { jewelleryType: 'BRACELET', nameEn: 'Chain Bracelet' } },
    update: {},
    create: {
      jewelleryType: 'BRACELET',
      nameEn: 'Chain Bracelet',
      nameNe: 'चेन ब्रेसलेट',
      descriptionEn: 'Elegant chain bracelet with secure clasp',
      lightWeightMin: 3.0,
      lightWeightMax: 6.0,
      mediumWeightMin: 6.0,
      mediumWeightMax: 12.0,
      heavyWeightMin: 12.0,
      heavyWeightMax: 25.0,
      defaultDimensions: { length: 180, linkSize: 5 },
      recommendedMaterials: ['GOLD_18K', 'GOLD_22K', 'SILVER_925'],
      iconName: 'bracelet-chain',
      sortOrder: 1,
    },
  });

  console.log('✅ Created jewellery templates');

  // ══════════════════════════════════════
  // GEMSTONE PRESETS
  // ══════════════════════════════════════
  await prisma.gemstonePreset.createMany({
    skipDuplicates: true,
    data: [
      {
        nameEn: 'Round Brilliant Diamond',
        stoneType: 'DIAMOND_NATURAL',
        shape: 'ROUND',
        settingStyle: 'PRONG',
        sizeOptions: [
          { label: 'Small (3mm)', sizeMm: 3, caratWeight: 0.10, priceNpr: 15000 },
          { label: 'Medium (4mm)', sizeMm: 4, caratWeight: 0.25, priceNpr: 35000 },
          { label: 'Large (5mm)', sizeMm: 5, caratWeight: 0.50, priceNpr: 80000 },
          { label: 'Statement (6mm)', sizeMm: 6, caratWeight: 0.80, priceNpr: 150000 },
        ],
        colorOptions: ['D', 'E', 'F', 'G', 'H', 'I'],
        defaultCount: 1,
        basePriceNpr: 35000,
        templateId: ringTemplate1.id,
      },
      {
        nameEn: 'Lab-Grown Diamond',
        stoneType: 'DIAMOND_LAB',
        shape: 'ROUND',
        settingStyle: 'PRONG',
        sizeOptions: [
          { label: 'Small (3mm)', sizeMm: 3, caratWeight: 0.10, priceNpr: 8000 },
          { label: 'Medium (4mm)', sizeMm: 4, caratWeight: 0.25, priceNpr: 18000 },
          { label: 'Large (5mm)', sizeMm: 5, caratWeight: 0.50, priceNpr: 40000 },
          { label: 'Statement (6mm)', sizeMm: 6, caratWeight: 0.80, priceNpr: 75000 },
        ],
        colorOptions: ['D', 'E', 'F', 'G'],
        defaultCount: 1,
        basePriceNpr: 18000,
        templateId: ringTemplate1.id,
      },
      {
        nameEn: 'Moissanite',
        stoneType: 'MOISSANITE',
        shape: 'ROUND',
        settingStyle: 'PRONG',
        sizeOptions: [
          { label: 'Small (4mm)', sizeMm: 4, caratWeight: 0.25, priceNpr: 5000 },
          { label: 'Medium (5mm)', sizeMm: 5, caratWeight: 0.50, priceNpr: 8000 },
          { label: 'Large (6mm)', sizeMm: 6, caratWeight: 0.80, priceNpr: 12000 },
          { label: 'Statement (7mm)', sizeMm: 7, caratWeight: 1.25, priceNpr: 18000 },
        ],
        colorOptions: ['DEF (Colorless)', 'GHI (Near Colorless)'],
        defaultCount: 1,
        basePriceNpr: 8000,
        templateId: ringTemplate1.id,
      },
      {
        nameEn: 'Cubic Zirconia',
        stoneType: 'CUBIC_ZIRCONIA',
        shape: 'ROUND',
        settingStyle: 'PRONG',
        sizeOptions: [
          { label: 'Small (4mm)', sizeMm: 4, caratWeight: 0.25, priceNpr: 200 },
          { label: 'Medium (5mm)', sizeMm: 5, caratWeight: 0.50, priceNpr: 350 },
          { label: 'Large (6mm)', sizeMm: 6, caratWeight: 0.80, priceNpr: 500 },
          { label: 'Statement (8mm)', sizeMm: 8, caratWeight: 1.50, priceNpr: 800 },
        ],
        colorOptions: ['Clear', 'Blue', 'Pink', 'Yellow'],
        defaultCount: 1,
        basePriceNpr: 350,
      },
      {
        nameEn: 'Ruby',
        stoneType: 'RUBY',
        shape: 'OVAL',
        settingStyle: 'BEZEL',
        sizeOptions: [
          { label: 'Small (4x3mm)', sizeMm: 4, caratWeight: 0.20, priceNpr: 25000 },
          { label: 'Medium (6x4mm)', sizeMm: 6, caratWeight: 0.50, priceNpr: 60000 },
          { label: 'Large (7x5mm)', sizeMm: 7, caratWeight: 0.80, priceNpr: 100000 },
        ],
        colorOptions: ['Pigeon Blood Red', 'Deep Red', 'Pinkish Red'],
        defaultCount: 1,
        basePriceNpr: 60000,
      },
      {
        nameEn: 'Blue Sapphire',
        stoneType: 'SAPPHIRE',
        shape: 'OVAL',
        settingStyle: 'PRONG',
        sizeOptions: [
          { label: 'Small (4x3mm)', sizeMm: 4, caratWeight: 0.20, priceNpr: 20000 },
          { label: 'Medium (6x4mm)', sizeMm: 6, caratWeight: 0.50, priceNpr: 50000 },
          { label: 'Large (7x5mm)', sizeMm: 7, caratWeight: 0.80, priceNpr: 85000 },
        ],
        colorOptions: ['Royal Blue', 'Cornflower Blue', 'Light Blue'],
        defaultCount: 1,
        basePriceNpr: 50000,
      },
      {
        nameEn: 'Emerald',
        stoneType: 'EMERALD',
        shape: 'EMERALD_CUT',
        settingStyle: 'BEZEL',
        sizeOptions: [
          { label: 'Small (5x3mm)', sizeMm: 5, caratWeight: 0.25, priceNpr: 30000 },
          { label: 'Medium (6x4mm)', sizeMm: 6, caratWeight: 0.50, priceNpr: 70000 },
          { label: 'Large (7x5mm)', sizeMm: 7, caratWeight: 0.80, priceNpr: 120000 },
        ],
        colorOptions: ['Vivid Green', 'Medium Green', 'Light Green'],
        defaultCount: 1,
        basePriceNpr: 70000,
      },
      {
        nameEn: 'Pearl',
        stoneType: 'PEARL',
        shape: 'CABOCHON',
        settingStyle: 'BEZEL',
        sizeOptions: [
          { label: 'Small (5mm)', sizeMm: 5, priceNpr: 2000 },
          { label: 'Medium (7mm)', sizeMm: 7, priceNpr: 5000 },
          { label: 'Large (9mm)', sizeMm: 9, priceNpr: 10000 },
          { label: 'Statement (11mm)', sizeMm: 11, priceNpr: 20000 },
        ],
        colorOptions: ['White', 'Cream', 'Pink', 'Black', 'Golden'],
        defaultCount: 1,
        basePriceNpr: 5000,
      },
      {
        nameEn: 'Amethyst',
        stoneType: 'AMETHYST',
        shape: 'CUSHION',
        settingStyle: 'PRONG',
        sizeOptions: [
          { label: 'Small (5mm)', sizeMm: 5, caratWeight: 0.50, priceNpr: 1500 },
          { label: 'Medium (7mm)', sizeMm: 7, caratWeight: 1.00, priceNpr: 3000 },
          { label: 'Large (9mm)', sizeMm: 9, caratWeight: 2.00, priceNpr: 5500 },
        ],
        colorOptions: ['Deep Purple', 'Medium Purple', 'Light Lavender'],
        defaultCount: 1,
        basePriceNpr: 3000,
      },
    ],
  });
  console.log('✅ Created gemstone presets');

  // ══════════════════════════════════════
  // PLATING OPTIONS
  // ══════════════════════════════════════
  await prisma.platingOption.createMany({
    skipDuplicates: true,
    data: [
      { platingType: 'GOLD_PLATING', tier: 'LIGHT', nameEn: 'Light Gold Plating (0.5-1μm)', thicknessMin: 0.5, thicknessMax: 1.0, basePriceNpr: 500, durabilityMonths: 6 },
      { platingType: 'GOLD_PLATING', tier: 'STANDARD', nameEn: 'Standard Gold Plating (1-2.5μm)', thicknessMin: 1.0, thicknessMax: 2.5, basePriceNpr: 1000, durabilityMonths: 12 },
      { platingType: 'GOLD_PLATING', tier: 'PREMIUM', nameEn: 'Premium Gold Plating (2.5-5μm)', thicknessMin: 2.5, thicknessMax: 5.0, basePriceNpr: 2000, durabilityMonths: 24 },
      { platingType: 'ROSE_GOLD_PLATING', tier: 'LIGHT', nameEn: 'Light Rose Gold Plating', thicknessMin: 0.5, thicknessMax: 1.0, basePriceNpr: 600, durabilityMonths: 6 },
      { platingType: 'ROSE_GOLD_PLATING', tier: 'STANDARD', nameEn: 'Standard Rose Gold Plating', thicknessMin: 1.0, thicknessMax: 2.5, basePriceNpr: 1200, durabilityMonths: 12 },
      { platingType: 'ROSE_GOLD_PLATING', tier: 'PREMIUM', nameEn: 'Premium Rose Gold Plating', thicknessMin: 2.5, thicknessMax: 5.0, basePriceNpr: 2400, durabilityMonths: 24 },
      { platingType: 'RHODIUM_PLATING', tier: 'LIGHT', nameEn: 'Light Rhodium Plating', thicknessMin: 0.25, thicknessMax: 0.5, basePriceNpr: 400, durabilityMonths: 12 },
      { platingType: 'RHODIUM_PLATING', tier: 'STANDARD', nameEn: 'Standard Rhodium Plating', thicknessMin: 0.5, thicknessMax: 1.0, basePriceNpr: 800, durabilityMonths: 24 },
      { platingType: 'RHODIUM_PLATING', tier: 'PREMIUM', nameEn: 'Premium Rhodium Plating', thicknessMin: 1.0, thicknessMax: 2.0, basePriceNpr: 1500, durabilityMonths: 36 },
      { platingType: 'VERMEIL', tier: 'STANDARD', nameEn: 'Vermeil (Gold over Sterling Silver)', descriptionEn: 'Requires Sterling Silver base', thicknessMin: 2.5, thicknessMax: 5.0, basePriceNpr: 1800, durabilityMonths: 24 },
      { platingType: 'VERMEIL', tier: 'PREMIUM', nameEn: 'Premium Vermeil', descriptionEn: 'Thick gold layer over Sterling Silver', thicknessMin: 5.0, thicknessMax: 10.0, basePriceNpr: 3500, durabilityMonths: 36 },
      { platingType: 'PVD_COATING', tier: 'STANDARD', nameEn: 'PVD Gold Coating', thicknessMin: 0.5, thicknessMax: 2.0, basePriceNpr: 1500, durabilityMonths: 36 },
      { platingType: 'PVD_COATING', tier: 'PREMIUM', nameEn: 'Premium PVD Coating', thicknessMin: 2.0, thicknessMax: 5.0, basePriceNpr: 3000, durabilityMonths: 60 },
    ],
  });
  console.log('✅ Created plating options');

  // Seed Market Configurations
  console.log('🌍 Seeding market configurations...');
  
  // Nepal
  await prisma.marketConfig.upsert({
    where: { countryCode: 'NP' },
    update: {},
    create: {
      countryCode: 'NP',
      countryName: 'Nepal',
      isActive: true,
      defaultCurrency: 'NPR',
      supportedCurrencies: ['NPR', 'USD'],
      defaultWeightUnit: 'TOLA',
      supportedWeightUnits: ['TOLA', 'LAAL', 'GRAM', 'KILOGRAM'],
      supportedPaymentMethods: ['ESEWA', 'KHALTI', 'CONNECTIPS', 'BANK_TRANSFER', 'PAID_AT_SHOP'],
      heroHeadline: 'Discover Exquisite Jewellery From Trusted Artisans',
      heroSubheadline: 'Connect with verified local jewellers, browse ready-made pieces, or get custom jewellery crafted exactly to your specifications.',
      contactEmail: 'nepal@orivraa.com',
      contactPhone: '+977 9800000000',
      contactAddress: 'Kathmandu, Nepal',
      taxPercentage: 13,
      taxName: 'VAT',
      priceMultiplier: 1.245,
      codEnabled: true,
      customOrdersEnabled: true,
    },
  });

  // India
  await prisma.marketConfig.upsert({
    where: { countryCode: 'IN' },
    update: {},
    create: {
      countryCode: 'IN',
      countryName: 'India',
      isActive: true,
      defaultCurrency: 'INR',
      supportedCurrencies: ['INR', 'USD'],
      defaultWeightUnit: 'GRAM',
      supportedWeightUnits: ['GRAM', 'TOLA', 'KILOGRAM'],
      supportedPaymentMethods: ['UPI', 'CARD', 'BANK_TRANSFER', 'PAID_AT_SHOP'],
      heroHeadline: 'India\'s Premier Gold & Jewellery Marketplace',
      heroSubheadline: 'Shop from verified jewellers across India. Buy ready-made or custom-crafted jewellery with confidence.',
      contactEmail: 'india@orivraa.com',
      contactPhone: '+91 9000000000',
      contactAddress: 'Mumbai, India',
      taxPercentage: 3,
      taxName: 'GST',
      priceMultiplier: 1.1,
      codEnabled: true,
      customOrdersEnabled: true,
    },
  });

  // United States
  await prisma.marketConfig.upsert({
    where: { countryCode: 'US' },
    update: {},
    create: {
      countryCode: 'US',
      countryName: 'United States',
      isActive: true,
      defaultCurrency: 'USD',
      supportedCurrencies: ['USD'],
      defaultWeightUnit: 'OUNCE',
      supportedWeightUnits: ['OUNCE', 'GRAM', 'POUND'],
      supportedPaymentMethods: ['CARD', 'STRIPE', 'PAYPAL', 'BANK_TRANSFER'],
      heroHeadline: 'Handcrafted Jewellery from Master Artisans',
      heroSubheadline: 'Discover unique pieces crafted by skilled jewellers. From custom designs to ready-to-wear collections.',
      contactEmail: 'usa@orivraa.com',
      contactPhone: '+1 800 000 0000',
      contactAddress: 'New York, USA',
      taxPercentage: 0,
      taxName: 'Sales Tax',
      priceMultiplier: 1.0,
      codEnabled: false,
      customOrdersEnabled: true,
    },
  });

  // United Kingdom
  await prisma.marketConfig.upsert({
    where: { countryCode: 'UK' },
    update: {},
    create: {
      countryCode: 'UK',
      countryName: 'United Kingdom',
      isActive: true,
      defaultCurrency: 'GBP',
      supportedCurrencies: ['GBP', 'EUR', 'USD'],
      defaultWeightUnit: 'GRAM',
      supportedWeightUnits: ['GRAM', 'OUNCE'],
      supportedPaymentMethods: ['CARD', 'STRIPE', 'PAYPAL', 'BANK_TRANSFER'],
      heroHeadline: 'Exquisite Jewellery for Every Occasion',
      heroSubheadline: 'Browse collections from verified British and international jewellers. Quality guaranteed.',
      contactEmail: 'uk@orivraa.com',
      contactPhone: '+44 20 0000 0000',
      contactAddress: 'London, UK',
      taxPercentage: 20,
      taxName: 'VAT',
      priceMultiplier: 1.01,
      codEnabled: false,
      customOrdersEnabled: true,
    },
  });

  // Europe
  await prisma.marketConfig.upsert({
    where: { countryCode: 'EU' },
    update: {},
    create: {
      countryCode: 'EU',
      countryName: 'Europe',
      isActive: true,
      defaultCurrency: 'EUR',
      supportedCurrencies: ['EUR', 'USD'],
      defaultWeightUnit: 'GRAM',
      supportedWeightUnits: ['GRAM', 'KILOGRAM'],
      supportedPaymentMethods: ['CARD', 'STRIPE', 'PAYPAL', 'BANK_TRANSFER'],
      heroHeadline: 'European Jewellery Excellence',
      heroSubheadline: 'Connect with master craftsmen across Europe. From classic designs to modern masterpieces.',
      contactEmail: 'europe@orivraa.com',
      contactPhone: '+49 30 0000 0000',
      contactAddress: 'Berlin, Germany',
      taxPercentage: 19,
      taxName: 'VAT',
      priceMultiplier: 1.01,
      codEnabled: false,
      customOrdersEnabled: true,
    },
  });

  // UAE
  await prisma.marketConfig.upsert({
    where: { countryCode: 'AE' },
    update: {},
    create: {
      countryCode: 'AE',
      countryName: 'United Arab Emirates',
      isActive: true,
      defaultCurrency: 'AED',
      supportedCurrencies: ['AED', 'USD'],
      defaultWeightUnit: 'GRAM',
      supportedWeightUnits: ['GRAM', 'TOLA', 'OUNCE'],
      supportedPaymentMethods: ['CARD', 'BANK_TRANSFER', 'PAID_AT_SHOP'],
      heroHeadline: 'Luxury Jewellery from the Gold Souk',
      heroSubheadline: 'Experience the finest gold and diamond jewellery from Dubai\'s renowned craftsmen.',
      contactEmail: 'uae@orivraa.com',
      contactPhone: '+971 4 000 0000',
      contactAddress: 'Dubai, UAE',
      taxPercentage: 5,
      taxName: 'VAT',
      priceMultiplier: 1.02,
      codEnabled: true,
      customOrdersEnabled: true,
    },
  });

  console.log('✅ Created market configurations');

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('Admin: admin@goldshop.com / admin123');
  console.log('Customer: customer@test.com / customer123');
  console.log('Shopkeeper 1: rameshgold@test.com / shop123 (Ramesh Gold House)');
  console.log('Shopkeeper 2: sunajewellers@test.com / shop123 (Suna Jewellers)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
