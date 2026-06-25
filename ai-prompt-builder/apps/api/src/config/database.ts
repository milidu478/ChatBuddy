import { PrismaClient } from '@prisma/client';

// Development වලදී අනවශ්‍ය විදිහට database connections ගොඩක් හැදෙන එක නවත්තන්න මේ ක්‍රමය පාවිච්චි කරනවා
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'], // Console එකේ queries බලාගන්න පුළුවන්
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;