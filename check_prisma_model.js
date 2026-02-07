
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking BudgetSettings model...');
    if (prisma.budgetSettings) {
        console.log('prisma.budgetSettings exists');
        const settings = await prisma.budgetSettings.findFirst();
        console.log('Settings:', settings);
    } else {
        console.log('prisma.budgetSettings is UNDEFINED');
        console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_')));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
