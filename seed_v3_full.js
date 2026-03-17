
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
    console.log('Seeding User...');
    const user = await prisma.user.upsert({
        where: { email: 'owner@local.lumiflow' },
        update: {},
        create: {
            email: 'owner@local.lumiflow',
            name: 'Owner',
            passwordHash: '',
        },
    });

    console.log('Seeding Accounts...');
    const accountDefs = [
        { name: 'Main Account', type: 'PRIVATE' },
        { name: 'Shared Home', type: 'SHARED' },
    ];

    for (const accountDef of accountDefs) {
        let account = await prisma.account.findFirst({
            where: { name: accountDef.name, type: accountDef.type },
        });
        if (!account) {
            account = await prisma.account.create({
                data: {
                    name: accountDef.name,
                    type: accountDef.type,
                    balance: 0,
                },
            });
        }

        await prisma.accountMember.upsert({
            where: { userId_accountId: { userId: user.id, accountId: account.id } },
            update: {},
            create: {
                userId: user.id,
                accountId: account.id,
                role: 'OWNER',
            },
        });
    }

    console.log('Seeding Budget Settings...');
    const settings = await prisma.budgetSettings.findUnique({ where: { userId: user.id } });
    if (!settings) {
        await prisma.budgetSettings.create({
            data: {
                userId: user.id,
                monthlyIncome: 21000,
                needsPercent: 50,
                wantsPercent: 30,
                savingsPercent: 20
            }
        });
    }

    console.log('Seeding Categories...');
    for (const cat of DEFAULT_CATEGORIES) {
        const exists = await prisma.category.findUnique({ where: { userId_name: { userId: user.id, name: cat.name } } });
        if (!exists) {
            await prisma.category.create({ data: { ...cat, userId: user.id } });
        }
    }

    console.log('Seeding Complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
