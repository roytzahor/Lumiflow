const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.transaction.findMany({
        take: 10,
        orderBy: { date: 'desc' }
    });
    console.log('Recent Transactions:', transactions);

    const categories = await prisma.category.findMany();
    console.log('Categories:', categories.map(c => ({ name: c.name, icon: c.icon })));
}

main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
