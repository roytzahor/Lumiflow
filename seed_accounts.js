
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const joint = await prisma.account.upsert({
        where: { id: 'joint-acc-id' }, // Using a fixed ID for simplicity if schema allows, or use findFirst logic
        update: {},
        create: {
            name: 'Joint Account',
            type: 'JOINT',
            isCredit: false
        }
    });

    const roy = await prisma.account.upsert({
        where: { id: 'roy-acc-id' },
        update: {},
        create: {
            name: 'Roy Private',
            type: 'PRIVATE',
            owner: 'Roy',
            isCredit: false
        }
    });

    const romi = await prisma.account.upsert({
        where: { id: 'romi-acc-id' },
        update: {},
        create: {
            name: 'Romi Private',
            type: 'PRIVATE',
            owner: 'Romi',
            isCredit: false
        }
    });

    console.log({ joint, roy, romi });
}

main()
    .catch(e => {
        console.error(e);
        // Fallback if IDs are auto-generated and valid UUID is required.
        // Based on previous error "Invalid uuid", IDs are likely UUIDs.
        // Upsert depends on finding by unique field. 
        // If ID is uuid, 'joint-acc-id' will fail. 
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
