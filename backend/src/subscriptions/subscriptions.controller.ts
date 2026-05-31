import {
  Controller, Get, Patch, Param, Body, UseGuards, Request, Query,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(FlexAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  listAdmin(
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.listAdmin({ category, type, status });
  }

  @Get('mine')
  listMine(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('type') type?: string,
  ) {
    return this.svc.listForUser(req.user.sub, req.user.email, { category, type });
  }

  @Get('renewals')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  listRenewals(@Query('service_id') serviceId?: string) {
    return this.svc.listRenewals(serviceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.svc.update(id, dto);
  }
}
