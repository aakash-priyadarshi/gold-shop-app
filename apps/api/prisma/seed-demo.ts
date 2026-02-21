/**
 * YC Demo Account Seed
 *
 * Creates demo accounts for Y Combinator application demo.
 * These accounts have emailVerified=true so they can log in immediately.
 *
 * Usage: npx tsx prisma/seed-demo.ts
 *
 * Accounts created:
 *   - demo-customer@orivraa.com  / Demo@2026  (CUSTOMER)
 *   - demo-shop@orivraa.com      / Demo@2026  (SHOPKEEPER)
 *
 */

import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Demo@2026";

const DEMO_ACCOUNTS = [
  {
    email: "demo-customer@orivraa.com",
    firstName: "Demo",
    lastName: "Customer",
    phone: "+9779800000010",
    role: UserRole.CUSTOMER,
  },
  {
    email: "demo-shop@orivraa.com",
    firstName: "Demo",
    lastName: "Shopkeeper",
    phone: "+9779800000011",
    role: UserRole.SHOPKEEPER,
  },
];

async function main() {
  console.log("🎯 Creating YC Demo accounts...\n");

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  for (const account of DEMO_ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      },
      create: {
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone,
        passwordHash,
        role: account.role,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        preferredLanguage: "en",
      },
    });

    console.log(
      `✅ ${account.role.padEnd(12)} ${account.email} (id: ${user.id})`,
    );

    // Create a shop for the shopkeeper account
    if (account.role === UserRole.SHOPKEEPER) {
      const existingShop = await prisma.shop.findFirst({
        where: { userId: user.id },
      });
      if (!existingShop) {
        const shop = await prisma.shop.create({
          data: {
            userId: user.id,
            shopName: "Golden Heritage Jewellers",
            shopNameNe: "गोल्डेन हेरिटेज ज्वेलर्स",
            description:
              "Premium handcrafted gold and silver jewellery since 1985. Specializing in traditional Nepali designs with modern craftsmanship.",
            descriptionNe:
              "१९८५ देखि प्रिमियम हस्तनिर्मित सुन र चाँदी गहना। परम्परागत नेपाली डिजाइनमा आधुनिक शिल्पकारिता।",
            address: "New Road, Basantapur",
            city: "Kathmandu",
            state: "Bagmati",
            country: "NP",
            contactPhone: account.phone,
            contactEmail: account.email,
            isVerified: true,
            isActive: true,
            supportedJewelleryTypes: [
              "RING",
              "NECKLACE",
              "BANGLE",
              "EARRING",
              "PENDANT",
              "BRACELET",
            ],
            supportedMethods: ["METHOD_A", "METHOD_B"],
            supportedMaterials: [
              "GOLD_24K",
              "GOLD_22K",
              "GOLD_18K",
              "SILVER_999",
              "SILVER_925",
            ],
            supportedFinishes: [
              "GOLD_PLATING",
              "RHODIUM_PLATING",
              "MATTE",
              "POLISHED",
            ],
            makingChargePercent: 12,
            minOrderValueNpr: 10000,
          },
        });
        console.log(`   🏪 Created shop: ${shop.shopName} (id: ${shop.id})`);
      } else {
        console.log(`   🏪 Shop already exists: ${existingShop.shopName}`);
      }
    }
  }

  console.log(
    `\n╔════════════════════════════════════════════════════════════╗`,
  );
  console.log(`║                    YC DEMO CREDENTIALS                     ║`);
  console.log(`╠════════════════════════════════════════════════════════════╣`);
  console.log(`║  👤 Customer Account                                       ║`);
  console.log(`║     Email:    demo-customer@orivraa.com                    ║`);
  console.log(`║     Password: Demo@2026                                    ║`);
  console.log(`╠════════════════════════════════════════════════════════════╣`);
  console.log(`║  🏪 Shopkeeper Account                                     ║`);
  console.log(`║     Email:    demo-shop@orivraa.com                        ║`);
  console.log(`║     Password: Demo@2026                                    ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
