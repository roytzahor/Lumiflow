const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categories = [
    { name: 'מגורים', icon: '🏠', type: 'Needs' },
    { name: 'סופר', icon: '🛒', type: 'Needs' },
    { name: 'אוכל', icon: '🍕', type: 'Wants' },
    { name: 'חשבונות', icon: '⚡', type: 'Needs' },
    { name: 'תחבורה', icon: '🚗', type: 'Needs' },
    { name: 'בריאות', icon: '💊', type: 'Needs' },
    { name: 'טיפוח', icon: '💇‍♂️', type: 'Wants' },
    { name: 'קניות', icon: '🛍️', type: 'Wants' },
    { name: 'מתנות', icon: '🎁', type: 'Wants' },
    { name: 'בילויים', icon: '🎬', type: 'Wants' },
    { name: 'לימודים', icon: '📚', type: 'Needs' },
    { name: 'כללי', icon: '✨', type: 'Wants' },
];

async function main() {
    const user = await prisma.user.upsert({
        where: { email: 'owner@local.lumiflow' },
        update: {},
        create: {
            email: 'owner@local.lumiflow',
            name: 'Owner',
            passwordHash: '',
        },
    });

    console.log('Start seeding categories...');
    for (const cat of categories) {
        const existing = await prisma.category.findUnique({ where: { userId_name: { userId: user.id, name: cat.name } } });
        if (!existing) {
            await prisma.category.create({ data: { ...cat, userId: user.id } });
            console.log(`Created category: ${cat.name}`);
        } else {
            console.log(`Category exists: ${cat.name}`);
        }
    }
    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
