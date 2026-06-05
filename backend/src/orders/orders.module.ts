import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersPublicController } from './orders.public.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { VerificationModule } from '../verification/verification.module';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [PrismaModule, AuthModule, VerificationModule, ReferralModule],
  providers: [OrdersService],
  controllers: [OrdersController, OrdersPublicController],
  exports: [OrdersService],
})
export class OrdersModule {}
