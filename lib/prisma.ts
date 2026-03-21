
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const shouldLogQueries =
  process.env.PRISMA_LOG_QUERIES === '1' ||
  process.env.PRISMA_LOG_QUERIES === 'true' ||
  process.env.NODE_ENV !== 'production';

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: shouldLogQueries ? ['query'] : ['error', 'warn'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
