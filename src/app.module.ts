import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SettingsModule } from './settings/settings.module';
import { CustomersModule } from './customers/customers.module';
import { RequestsModule } from './requests/requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TechnicianModule } from './technician/technician.module';
import { InventoryModule } from './inventory/inventory.module';
import { InvoicesModule } from './invoices/invoices.module';

import { PaymentsModule } from './payments/payments.module';
import { FinanceModule } from './finance/finance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PayrollRecordsModule } from './payroll-records/payroll-records.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: (config.get<number>('throttler.ttl') ?? 60) * 1000,
          limit: config.get<number>('throttler.limit') ?? 100,
        },
      ],
    }),

    // Database
    PrismaModule,

    // Authentication & Authorization
    AuthModule,

    // User Management
    UsersModule,
    SettingsModule,
    CustomersModule,
    RequestsModule,

    // Notifications
    NotificationsModule,

    // Technician Workflow
    TechnicianModule,

    // Inventory
    InventoryModule,

    // Invoices
    InvoicesModule,

    // Payments
    PaymentsModule,

    // Finance
    FinanceModule,

    // Dashboard
    DashboardModule,

    // Payroll Records
    PayrollRecordsModule,

    // Reports
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
