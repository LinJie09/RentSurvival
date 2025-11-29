// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'], // 這行會讓終端機顯示 SQL 指令，除錯超好用
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;