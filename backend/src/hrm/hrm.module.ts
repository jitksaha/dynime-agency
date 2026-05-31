import { Module } from '@nestjs/common';
import { HrmService } from './hrm.service';
import { HrmController } from './hrm.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [HrmService],
  controllers: [HrmController],
})
export class HrmModule {}
