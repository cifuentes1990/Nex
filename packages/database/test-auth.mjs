import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const url = 'postgresql://postgres.kwzxgyqqrfbdccpbqldf:pDnc4kZ8YrehuphC@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true';
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  await prisma.$connect();

  const user = await prisma.user.findUnique({
    where: { email: 'admin@nexuserp.com' },
    select: { id: true, email: true, passwordHash: true, status: true, organizationId: true },
  });

  if (!user) {
    console.log('❌ Usuario admin@nexuserp.com NO existe en la BD');
  } else {
    console.log('✅ Usuario encontrado:', user.email, '| status:', user.status);
    console.log('   Hash en BD:', user.passwordHash);

    const valid = await bcrypt.compare('Admin123!', user.passwordHash);
    console.log('   ¿Hash coincide con Admin123!?', valid ? '✅ SÍ' : '❌ NO');

    if (!valid) {
      // Generar hash correcto y actualizar
      const newHash = await bcrypt.hash('Admin123!', 12);
      console.log('   Nuevo hash generado:', newHash);

      await prisma.user.updateMany({
        where: { email: { in: ['admin@nexuserp.com', 'manager@nexuserp.com', 'cajero@nexuserp.com'] } },
        data: { passwordHash: newHash },
      });
      console.log('✅ Hash actualizado en todos los usuarios');
    }
  }

  await prisma.$disconnect();
} catch(e) {
  console.log('ERROR:', e.message);
  await prisma.$disconnect().catch(() => {});
}
