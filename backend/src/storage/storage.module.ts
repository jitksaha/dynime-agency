import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MinioService } from './minio.service';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [AuthModule],
  controllers: [StorageController],
  providers: [MinioService, StorageService],
  exports: [StorageService, MinioService],
})
export class StorageModule {}
