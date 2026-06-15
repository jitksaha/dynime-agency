import { Controller, Get, Version } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CmsService } from './cms.service';

@ApiTags('site-settings')
@Controller('site-settings')
export class SiteSettingsPublicController {
  constructor(private readonly cmsService: CmsService) {}

  @Get()
  @Version('1')
  async getPublicSettings() {
    return this.cmsService.getPublicSettings();
  }
}
