import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { PublicFormsService } from './public-forms.service';
import { PublicFormsController } from './public-forms.controller';
import { AtsScanService } from './ats-scan.service';

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [PublicFormsService, AtsScanService],
  controllers: [PublicFormsController],
  exports: [PublicFormsService, AtsScanService],
})
export class PublicFormsModule {}
