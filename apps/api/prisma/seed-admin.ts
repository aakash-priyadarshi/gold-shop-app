import { PrismaClient, UserRole, UserStatus, CurrencyCode } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin user...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@orivraa.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!@#';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`✓ Admin user already exists: ${adminEmail}`);
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      preferredLanguage: 'en',
      preferredCurrency: CurrencyCode.NPR,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`✅ Admin user created successfully!`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   ID: ${admin.id}`);
  console.log('\n⚠️  IMPORTANT: Change the default password immediately in production!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
