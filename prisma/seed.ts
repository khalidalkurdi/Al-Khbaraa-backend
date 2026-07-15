import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const roles = ['Admin', 'Manager', 'Employee', 'Technician'];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'defaultPassword';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const adminRole = await prisma.role.findUnique({
      where: { name: 'Admin' },
    });

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'المسؤول',
        jobTitle: 'مسؤول النظام الرئيسي',
        userNumber: 'ADMIN-001',
        roleId: adminRole!.id,
        phone: '',
        salary: 0,
        tokenDevice: '',
      },
    });
  } else {
    console.log('✓ Admin user already exists');
  }

  const existingCenterSettings = await prisma.centerSettings.findFirst();

  if (!existingCenterSettings) {
    await prisma.centerSettings.create({
      data: {
        centerName: 'مركز الخبراء',
        address: 'العنوان',
        phone1: '0900000000',
        email: 'center@example.com',
        dollarExchangeRate: 100,
      },
    });
    console.log('✓ Center settings created');
  } else {
    console.log('✓ Center settings already exist');
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
