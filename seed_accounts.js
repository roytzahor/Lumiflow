
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

    const accountsToEnsure = [
        { name: 'Main Account', type: 'PRIVATE' },
        { name: 'Shared Home', type: 'SHARED' },
    ];

    for (const accountDef of accountsToEnsure) {
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

    console.log('Seeded generic accounts for', user.email);
}

main()
    .catch(e => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
