import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const userCount = await prisma.user.count();
    const orderCount = await prisma.order.count();
    console.log(`Database Status: Users=${userCount}, Orders=${orderCount}`);
  } catch (error: any) {
    console.error(`Database error: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}
main();
