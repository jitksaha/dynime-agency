import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IsString } from 'class-validator';

class UpdateStatusDto { @IsString() status!: string; }

@UseGuards(FlexAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly svc: TicketsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  listAdmin() {
    return this.svc.listAdmin();
  }

  @Get('mine')
  listMine(@Request() req: any) {
    return this.svc.listForUser(req.user.sub, req.user.email);
  }

  @Post()
  create(@Body() dto: CreateTicketDto, @Request() req: any) {
    return this.svc.createTicket(dto, req.user.sub, req.user.email, req.user.name);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const isAdmin = ['super_admin', 'manager', 'admin'].includes(req.user?.role);
    return this.svc.findOne(id, req.user.sub, req.user.email, isAdmin);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string, @Request() req: any) {
    const isAdmin = ['super_admin', 'manager', 'admin'].includes(req.user?.role);
    return this.svc.getMessages(id, req.user.sub, req.user.email, isAdmin);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @Request() req: any,
  ) {
    const isAdmin = ['super_admin', 'manager', 'admin'].includes(req.user?.role);
    return this.svc.addMessage(id, dto, req.user.sub, req.user.email, req.user.name, isAdmin);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.svc.updateStatus(id, dto.status);
  }
}
