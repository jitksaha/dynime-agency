import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';

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

  @Get('by-email/:email')
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  getByEmail(@Param('email') email: string) {
    return this.users.getProfileByEmail(email);
  }

  @Get('by-phone/:phone')
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  getByPhone(@Param('phone') phone: string) {
    return this.users.getProfileByPhone(phone);
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

  @Post('create')
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  adminCreate(@Body() dto: CreateUserDto) {
    return this.users.adminCreateUser(dto);
  }

  @Delete(':id')
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  adminDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.adminDeleteUser(id);
  }

  @Patch(':id/role')
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  adminUpdateRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.users.adminUpdateUserRole(id, dto.role);
  }

  @Patch(':id/reset-password')
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  adminResetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminResetPasswordDto) {
    return this.users.adminResetUserPassword(id, dto.password);
  }

  @Get(':id')
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getProfile(id);
  }
}
