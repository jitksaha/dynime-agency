import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Headers,
  UseGuards,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const ADMIN = ['super_admin', 'admin'];

@ApiTags('backup')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  // Google OAuth Authorization start endpoint
  @Get('google/auth')
  @Version('1')
  async googleAuth(@Headers('host') host: string, @Res() res: any) {
    const authUrl = await this.backupService.getAuthUrl(host);
    return res.redirect(authUrl);
  }

  // Google OAuth Redirect callback endpoint
  @Get('google/callback')
  @Version('1')
  async googleCallback(
    @Query('code') code: string,
    @Headers('host') host: string,
    @Res() res: any,
  ) {
    return this.backupService.handleCallback(code, host, res);
  }

  // Connection settings status check
  @Get('google/status')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  async getStatus() {
    return this.backupService.getStatus();
  }

  // Disconnect Google Drive
  @Post('google/disconnect')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  async disconnect() {
    return this.backupService.disconnect();
  }

  // Manually trigger backup from Admin Panel
  @Post('run')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  async runBackup() {
    return this.backupService.runBackup();
  }
}
