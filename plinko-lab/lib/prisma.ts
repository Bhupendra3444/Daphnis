import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

let prismaUrl = process.env.DATABASE_URL;

// On Vercel, the filesystem is read-only. We copy the sqlite DB to /tmp to allow Prisma to write to it.
if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/dev.db';
  const originalDbPath = path.join(process.cwd(), 'dev.db');
  
  if (!fs.existsSync(tmpDbPath)) {
    try {
      if (fs.existsSync(originalDbPath)) {
        fs.copyFileSync(originalDbPath, tmpDbPath);
      }
    } catch (e) {
      console.error("Failed to copy db to tmp", e);
    }
  }
  prismaUrl = 'file:/tmp/dev.db';
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: prismaUrl,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
