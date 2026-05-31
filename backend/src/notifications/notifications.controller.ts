import {
  Controller, Get, Patch, Body, UseGuards, Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IsArray, IsString } from 'class-validator';

class MarkReadDto {
  @IsArray() @IsString({ each: true }) ids!: string[];
}

@UseGuards(FlexAuthGuard, RolesGuard)
@Roles('super_admin', 'manager', 'admin')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('submissions')
  getSubmissions(@Query('unread') unread?: string) {
    return this.svc.getFormSubmissions(unread === 'true');
  }

  @Patch('submissions/read')
  markSubmissionsRead(@Body() dto: MarkReadDto) {
    return this.svc.markSubmissionsRead(dto.ids);
  }

  @Get('chats')
  getChats(@Query('unread') unread?: string) {
    return this.svc.getChatMessages(unread === 'true');
  }

  @Patch('chats/read')
  markChatsRead(@Body() dto: MarkReadDto) {
    return this.svc.markChatsRead(dto.ids);
  }

  @Get('email-log')
  emailLog(@Query('limit') limit?: string) {
    return this.svc.getEmailLog(Number(limit ?? 100));
  }

  @Get('settings')
  settings() {
    return this.svc.getSettings();
  }
}
