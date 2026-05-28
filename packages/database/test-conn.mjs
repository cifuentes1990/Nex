import { PrismaClient } from '@prisma/client';

const url = 'postgresql://postgres.kwzxgyqqrfbdccpbqldf:pDnc4kZ8YrehuphC@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true';
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  await prisma.$connect();
  const r = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log('✅ CONECTADO OK:', JSON.stringify(r));
  await prisma.$disconnect();
} catch(e) {
  console.log('❌ ERROR:', e.message.slice(0, 200));
  await prisma.$disconnect().catch(() => {});
}
