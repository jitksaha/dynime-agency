import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MinioService } from './minio.service';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { DbProxyController } from './db-proxy.controller';

@Module({
  imports: [AuthModule],
  controllers: [StorageController, DbProxyController],
  providers: [MinioService, StorageService],
  exports: [StorageService, MinioService],
})
export class StorageModule {}
