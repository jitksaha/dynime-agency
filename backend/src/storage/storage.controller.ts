import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user';
import { RequestContext } from '../auth/token.service';
import { StorageService, UploadedFileLike } from './storage.service';
import { UploadDto } from './dto/upload.dto';
import { ObjectKeyQueryDto, ListPrefixQueryDto } from './dto/object-key-query.dto';
import { GLOBAL_MAX_UPLOAD_BYTES } from './storage.constants';

function context(req: Request): RequestContext {
  const header = (name: string): string | null => {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : (value ?? null);
  };
  return { ip: req.ip ?? null, userAgent: header('user-agent') };
}

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get('buckets')
  @Version('1')
  buckets() {
    return this.storage.listBuckets();
  }

  @Post(':bucket')
  @Version('1')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: GLOBAL_MAX_UPLOAD_BYTES, files: 1, fields: 10 },
    }),
  )
  upload(
    @Param('bucket') bucket: string,
    @UploadedFile() file: UploadedFileLike,
    @Body() dto: UploadDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.storage.upload(bucket, dto.key, file, user, context(req));
  }

  @Get(':bucket/sign')
  @Version('1')
  sign(
    @Param('bucket') bucket: string,
    @Query() query: ObjectKeyQueryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.storage.getSignedUrl(bucket, query.key, user, context(req));
  }

  @Get(':bucket/stat')
  @Version('1')
  stat(
    @Param('bucket') bucket: string,
    @Query() query: ObjectKeyQueryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.storage.stat(bucket, query.key, user, context(req));
  }

  @Get(':bucket/list')
  @Version('1')
  list(
    @Param('bucket') bucket: string,
    @Query() query: ListPrefixQueryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.storage.list(bucket, query.prefix, user, context(req));
  }

  @Get(':bucket/download')
  @Version('1')
  async download(
    @Param('bucket') bucket: string,
    @Query() query: ObjectKeyQueryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { stream, stat } = await this.storage.getObjectStream(
      bucket,
      query.key,
      user,
      context(req),
    );
    const mime = stat.metaData?.['content-type'] ?? 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    if (stat.size) res.setHeader('Content-Length', String(stat.size));
    const filename = query.key.split('/').pop() ?? 'download';
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    stream.pipe(res);
  }
}
