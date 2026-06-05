import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
  Version,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { PublicFormsService } from './public-forms.service';
import { UploadedFileLike } from '../storage/storage.service';

@Controller('public/forms')
export class PublicFormsController {
  constructor(private readonly formsService: PublicFormsService) {}

  @Post('subscribe')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async subscribe(
    @Body('email') email: string,
    @Body('source') source?: string,
  ) {
    return this.formsService.subscribeNewsletter(email, source);
  }

  @Post('submit')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async submit(
    @Body('slug') slug: string,
    @Body('data') data: any,
    @Req() req: Request,
  ) {
    const ip = req.ip || undefined;
    return this.formsService.submitForm(slug, data, ip);
  }

  @Post('invest-lead')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async investLead(@Body() data: any) {
    return this.formsService.submitInvestLead(data);
  }

  @Post('upload-resume')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadResume(
    @UploadedFile() file: UploadedFileLike,
    @Query('key') key: string,
  ) {
    return this.formsService.uploadResumeFile(file, key);
  }

  @Post('apply')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async apply(
    @Body() data: any,
    @Req() req: Request,
  ) {
    const ip = req.ip || undefined;
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.formsService.submitJobApplication(data, ip, userAgent);
  }
}
