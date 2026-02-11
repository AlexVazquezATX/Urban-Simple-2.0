// Prisma client singleton
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Limit connections per serverless instance to avoid exhausting Supabase pool
    datasourceUrl: process.env.DATABASE_URL
      ? `${process.env.DATABASE_URL}&connection_limit=3`
      : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
