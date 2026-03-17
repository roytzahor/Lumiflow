
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    let mainAccount = await prisma.account.findFirst({
        where: { name: 'Main Account', type: 'PRIVATE' },
    });
    if (!mainAccount) {
        mainAccount = await prisma.account.create({
            data: {
                name: 'Main Account',
                type: 'PRIVATE',
                balance: 0,
            },
        });
    }

    await prisma.accountMember.upsert({
        where: { userId_accountId: { userId: user.id, accountId: mainAccount.id } },
        update: {},
        create: {
            userId: user.id,
            accountId: mainAccount.id,
            role: 'OWNER',
        },
    });

    console.log('Seeded user + account:', user.email, mainAccount.name);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
