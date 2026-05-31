import {
  Controller, Get, Patch, Post, Param, Query, Body, UseGuards, Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ClaimOrderDto } from './dto/claim-order.dto';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(FlexAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly svc: OrdersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  listAdmin(@Query() dto: ListOrdersDto) {
    return this.svc.listAdmin(dto);
  }

  @Get('mine')
  listMine(@Request() req: any) {
    return this.svc.listForUser(req.user.email, req.user.sub);
  }

  @Get(':id/milestones')
  getMilestones(@Param('id') id: string) {
    return this.svc.getMilestones(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const isAdmin = ['super_admin', 'manager', 'admin'].includes(req.user?.role);
    return this.svc.findOne(id, req.user.email, req.user.sub, isAdmin);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto, @Request() req: any) {
    return this.svc.updateOrder(id, dto, req.user.sub);
  }

  @Post(':id/cancel')
  cancelOrder(@Param('id') id: string, @Request() req: any) {
    return this.svc.cancelOrder(id, req.user.sub, req.user.email);
  }

  @Post('claim')
  claimOrder(@Body() dto: ClaimOrderDto, @Request() req: any) {
    return this.svc.claimOrder(dto, req.user.sub, req.user.email);
  }
}
