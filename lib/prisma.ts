import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Reset the cached instance every restart to pick up new schema models
globalForPrisma.prisma = undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
// Schema v3 - chatMessage, template, webhookConfig added
