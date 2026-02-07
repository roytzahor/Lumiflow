const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mapping = {
    'Housing': 'מגורים',
    'Groceries': 'סופר',
    'Food': 'אוכל',
    'Utilities': 'חשבונות',
    'Transportation': 'תחבורה',
    'Health': 'בריאות',
    'Personal Care': 'טיפוח',
    'Shopping': 'קניות',
    'Gifts': 'מתנות',
    'Entertainment': 'בילויים',
    'Education': 'לימודים',
    'General': 'כללי',
    'Needs': 'כללי', // Cleanup any leftovers
    'Wants': 'כללי'  // Cleanup any leftovers
};

const icons = {
    'מגורים': '🏠',
    'סופר': '🛒',
    'אוכל': '🍕',
    'חשבונות': '⚡',
    'תחבורה': '🚗',
    'בריאות': '💊',
    'טיפוח': '💇‍♂️',
    'קניות': '🛍️',
    'מתנות': '🎁',
    'בילויים': '🎬',
    'לימודים': '📚',
    'כללי': '✨'
};

async function main() {
    console.log('Starting localization migration...');

    // 1. Update Transactions first (to avoid foreign key issues if we were strictly enforcing, though Category is just a string here usually, but good practice)
    // Actually, in this schema, Transaction.category is just a String, not a relation to Category model (based on my memory of schema.prisma, let me double check mentally... yes usually just string in this app). 
    // Wait, let's look at schema.prisma again to be sure if it's a relation. 
    // In schema.prisma: category String. It's not a relation to Category model.
    // So we can update transactions freely.

    for (const [english, hebrew] of Object.entries(mapping)) {
        const result = await prisma.transaction.updateMany({
            where: { category: english },
            data: { category: hebrew }
        });
        if (result.count > 0) {
            console.log(`Migrated ${result.count} transactions from '${english}' to '${hebrew}'`);
        }
    }

    // 2. Update recurring transactions
    for (const [english, hebrew] of Object.entries(mapping)) {
        await prisma.recurringTransaction.updateMany({
            where: { category: english },
            data: { category: hebrew }
        });
    }

    // 3. Update Category Definitions
    // Since names must be unique, we can't just rename 'Housing' to 'מגורים' if 'מגורים' already exists.
    // We should upsert: if hebrew exists, keep it. If english exists, rename it? 
    // Or simpler: Delete all English categories and create Hebrew ones if missing.
    // Let's try to rename if possible to keep IDs? 
    // Actually, simpler is to just ensure Hebrew categories exist and delete English ones.

    console.log('Updating Category definitions...');

    // Create/Ensure Hebrew categories exist
    for (const [hebrew, icon] of Object.entries(icons)) {
        await prisma.category.upsert({
            where: { name: hebrew },
            update: { icon }, // Update icon just in case
            create: {
                name: hebrew,
                icon: icon,
                type: 'expense',
                isCustom: false
            }
        });
    }

    // Delete English categories
    const englishNames = Object.keys(mapping);
    const deleteResult = await prisma.category.deleteMany({
        where: {
            name: { in: englishNames }
        }
    });
    console.log(`Deleted ${deleteResult.count} English category definitions.`);

    console.log('Localization complete.');
}

main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
