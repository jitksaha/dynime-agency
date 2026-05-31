import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
  ],
  providers: [VerificationService, FlexAuthGuard],
  controllers: [VerificationController],
  exports: [VerificationService, FlexAuthGuard],
})
export class VerificationModule {}
