
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
/** SQL query logging is opt-in — it is noisy and slows dev machines. */
const shouldLogQueries =
  process.env.PRISMA_LOG_QUERIES === '1' || process.env.PRISMA_LOG_QUERIES === 'true';

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: shouldLogQueries ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
