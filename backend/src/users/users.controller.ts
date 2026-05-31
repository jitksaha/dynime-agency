import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ADMIN_ROLES } from '../auth/auth.constants';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @Version('1')
  getMe(@CurrentUser('id') id: string) {
    return this.users.getProfile(id);
  }

  @Patch('me')
  @Version('1')
  updateMe(@CurrentUser('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateOwnProfile(id, dto);
  }

  @Get()
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  list(@Query() query: ListUsersQueryDto) {
    return this.users.listUsers(query);
  }

  @Get(':id')
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getProfile(id);
  }
}
