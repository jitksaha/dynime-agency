import {
  Controller, Get, Patch, Post, Delete, Param, Query, Body, UseGuards, Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ListOrdersDto } from './dto/list-orders.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ClaimOrderDto } from './dto/claim-order.dto';
import { CreateFxOrderDto, UpdateFxOrderDto } from './dto/fx-order.dto';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(FlexAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly svc: OrdersService) {}

  @Get('fx')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  listFxOrders() {
    return this.svc.listFxOrders();
  }

  @Post('fx')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  createFxOrder(@Body() dto: CreateFxOrderDto, @Request() req: any) {
    return this.svc.createFxOrder(dto, req.user.sub);
  }

  @Patch('fx/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  updateFxOrder(@Param('id') id: string, @Body() dto: UpdateFxOrderDto) {
    return this.svc.updateFxOrder(id, dto);
  }

  @Delete('fx/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  deleteFxOrder(@Param('id') id: string) {
    return this.svc.deleteFxOrder(id);
  }

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
    const isAdmin = req.user?.roles?.some((r: string) =>
      ['super_admin', 'manager', 'admin'].includes(r),
    ) ?? false;
    return this.svc.findOne(id, req.user.email, req.user.sub, isAdmin);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto, @Request() req: any) {
    return this.svc.updateOrder(id, dto, req.user.sub);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  create(@Body() dto: CreateOrderDto, @Request() req: any) {
    return this.svc.createOrder(dto, req.user.sub);
  }

  @Post(':id/cancel')
  cancelOrder(@Param('id') id: string, @Request() req: any) {
    return this.svc.cancelOrder(id, req.user.sub, req.user.email);
  }

  @Post('claim')
  claimOrder(@Body() dto: ClaimOrderDto, @Request() req: any) {
    return this.svc.claimOrder(dto, req.user.sub, req.user.email);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  delete(@Param('id') id: string) {
    return this.svc.deleteOrder(id);
  }
}
