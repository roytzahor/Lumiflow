const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.category.count();
    console.log(`Total categories: ${count}`);
    const cats = await prisma.category.findMany();
    console.log(cats);
}

main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
