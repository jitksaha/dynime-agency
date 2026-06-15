import { Module } from '@nestjs/common';
import { CmsService } from './cms.service';
import { CmsController } from './cms.controller';
import { SiteSettingsPublicController } from './site-settings-public.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { PublicFormsModule } from '../public-forms/public-forms.module';

@Module({
  imports: [PrismaModule, AuthModule, StorageModule, PublicFormsModule],
  providers: [CmsService],
  controllers: [CmsController, SiteSettingsPublicController],
})
export class CmsModule {}

