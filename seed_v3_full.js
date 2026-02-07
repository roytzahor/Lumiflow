
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
    { name: 'סופר', icon: '🛒', type: 'expense' },
    { name: 'דלק', icon: '⛽', type: 'expense' },
    { name: 'מסעדות', icon: '🍽️', type: 'expense' },
    { name: 'חשבונות', icon: '🧾', type: 'expense' },
    { name: 'ביגוד', icon: '👕', type: 'expense' },
    { name: 'בילויים', icon: '🎉', type: 'expense' },
    { name: 'משכורת', icon: '💰', type: 'income' },
    { name: 'אחר', icon: '📦', type: 'expense' }
];

async function main() {
    console.log('Seeding Accounts...');
    // JOINT
    let joint = await prisma.account.findFirst({ where: { type: 'JOINT' } });
    if (!joint) {
        joint = await prisma.account.create({
            data: {
                name: 'משותף', // Hebrew default
                type: 'JOINT',
                balance: 0
            }
        });
    }

    // Roy
    let roy = await prisma.account.findFirst({ where: { name: { contains: 'Roy', mode: 'insensitive' } } });
    if (!roy) {
        roy = await prisma.account.create({
            data: {
                name: 'Roy Private',
                type: 'PRIVATE',
                balance: 0,
                // owner: 'Roy' // If we add owner field, but current schema doesn't have it distinct from name logic? 
                // Schema has just name/type/balance.
            }
        });
    }

    // Romi
    let romi = await prisma.account.findFirst({ where: { name: { contains: 'Romi', mode: 'insensitive' } } });
    if (!romi) {
        romi = await prisma.account.create({
            data: {
                name: 'Romi Private',
                type: 'PRIVATE',
                balance: 0
            }
        });
    }

    console.log('Seeding Budget Settings...');
    const settings = await prisma.budgetSettings.findFirst();
    if (!settings) {
        await prisma.budgetSettings.create({
            data: {
                monthlyIncome: 21000,
                needsPercent: 50,
                wantsPercent: 30,
                savingsPercent: 20
            }
        });
    }

    console.log('Seeding Categories...');
    for (const cat of DEFAULT_CATEGORIES) {
        const exists = await prisma.category.findUnique({ where: { name: cat.name } });
        if (!exists) {
            await prisma.category.create({ data: cat });
        }
    }

    console.log('Seeding Complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
