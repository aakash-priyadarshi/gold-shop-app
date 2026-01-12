import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating admin email...');

  // Update admin email from goldshop to orivraa
  const result = await prisma.user.updateMany({
    where: { email: 'admin@goldshop.com' },
    data: { email: 'admin@orivraa.com' },
  });

  if (result.count > 0) {
    console.log(`✅ Updated ${result.count} admin user(s) email to admin@orivraa.com`);
  } else {
    console.log('ℹ️ No user found with email admin@goldshop.com (may already be updated)');
    
    // Check if admin@orivraa.com exists
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@orivraa.com' },
      select: { id: true, email: true, role: true },
    });
    
    if (admin) {
      console.log('✅ Admin user already exists:', admin);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
