import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() 
{
  const roles = ['Admin', 'Manager', 'Employee', 'Technician'];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'المسؤول',
        jobTitle: 'مدير النظام',
        salary: 0,
        tokenDevice: '',
      },
    });

    const adminRole = await prisma.role.findUnique({
      where: { name: 'Admin' },
    });

    await prisma.rolesUsers.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole!.id,
      },
    });
  } else {
    console.log('✓ Admin user already exists');
  }

}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });