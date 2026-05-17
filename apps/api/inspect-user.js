const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'aakashmi301@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      firstName: true,
      phone: true,
      createdAt: true,
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('--- User Info ---');
  console.log(JSON.stringify(user, null, 2));

  const shops = await prisma.shop.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      country: true,
      currency: true,
      plan: true,
      planTier: true,
    }
  });

  console.log('\n--- Shops Owned ---');
  console.log(JSON.stringify(shops, null, 2));

  for (const shop of shops) {
    console.log('\n--- Stats for Shop: ' + shop.name + ' (' + shop.id + ') ---');
    const inventoryCount = await prisma.inventoryItem.count({ where: { shopId: shop.id } });
    const orderCount = await prisma.order.count({ where: { shopId: shop.id } });
    
    let customerCount = 0;
    try {
        customerCount = await prisma.customerProfile.count({ where: { shopId: shop.id } });
    } catch(e) {
        try {
            customerCount = await prisma.customer.count({ where: { shopId: shop.id } });
        } catch(e2) {}
    }

    let billCount = 0;
    try {
        billCount = await prisma.bill.count({ where: { shopId: shop.id } });
    } catch(e) {}

    let quoteCount = 0;
    try {
        quoteCount = await prisma.shopQuote.count({ where: { shopId: shop.id } });
    } catch(e) {}

    console.log('InventoryItem: ' + inventoryCount);
    console.log('Order: ' + orderCount);
    console.log('Customer: ' + customerCount);
    console.log('Bill: ' + billCount);
    console.log('ShopQuote: ' + quoteCount);

    let subs = [];
    try {
        subs = await prisma.sellerSubscription.findMany({
          where: { userId: user.id, shopId: shop.id }
        });
    } catch(e) {}
    console.log('\n--- Seller Subscriptions ---');
    console.log(JSON.stringify(subs, null, 2));
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.();
  });
