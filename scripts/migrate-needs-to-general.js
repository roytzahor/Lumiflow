const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration...');

    // Find all transactions with category 'Needs' or 'Wants' (which are types, not categories)
    const invalidTransactions = await prisma.transaction.findMany({
        where: {
            OR: [
                { category: 'Needs' },
                { category: 'Wants' }
            ]
        }
    });

    console.log(`Found ${invalidTransactions.length} transactions to migrate.`);

    // Update them to 'General'
    const result = await prisma.transaction.updateMany({
        where: {
            OR: [
                { category: 'Needs' },
                { category: 'Wants' }
            ]
        },
        data: {
            category: 'General'
        }
    });

    console.log(`Migrated ${result.count} transactions to 'General'.`);
}

main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
