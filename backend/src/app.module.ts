import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { winstonConfig } from './config/logger.config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { VerificationModule } from './verification/verification.module';
import { OrdersModule } from './orders/orders.module';
import { CreditModule } from './credit/credit.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TicketsModule } from './tickets/tickets.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CrmModule } from './crm/crm.module';
import { HrmModule } from './hrm/hrm.module';
import { PayrollModule } from './payroll/payroll.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    WinstonModule.forRoot(winstonConfig),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_TTL ?? 60) * 1000,
        limit: Number(process.env.RATE_LIMIT_MAX ?? 120),
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    StorageModule,
    VerificationModule,
    OrdersModule,
    CreditModule,
    SubscriptionsModule,
    TicketsModule,
    NotificationsModule,
    AnalyticsModule,
    CrmModule,
    HrmModule,
    PayrollModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
