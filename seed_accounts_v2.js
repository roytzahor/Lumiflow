
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // JOINT
    let joint = await prisma.account.findFirst({ where: { type: 'JOINT' } });
    if (!joint) {
        console.log('Creating Joint Account...');
        joint = await prisma.account.create({
            data: {
                name: 'Joint Account',
                type: 'JOINT',
                balance: 0
            }
        });
    }
    console.log('Joint:', joint);

    // Roy
    let roy = await prisma.account.findFirst({ where: { name: { contains: 'Roy', mode: 'insensitive' } } });
    if (!roy) {
        console.log('Creating Roy Private...');
        roy = await prisma.account.create({
            data: {
                name: 'Roy Private',
                type: 'PRIVATE',
                balance: 0
            }
        });
    }
    console.log('Roy:', roy);

    // Romi
    let romi = await prisma.account.findFirst({ where: { name: { contains: 'Romi', mode: 'insensitive' } } });
    if (!romi) {
        console.log('Creating Romi Private...');
        romi = await prisma.account.create({
            data: {
                name: 'Romi Private',
                type: 'PRIVATE',
                balance: 0
            }
        });
    }
    console.log('Romi:', romi);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
