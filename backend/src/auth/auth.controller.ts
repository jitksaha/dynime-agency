import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FlexAuthGuard } from './guards/flex-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequestContext } from './token.service';
import { AuthUser } from './types/auth-user';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import {
  ResetPasswordDto,
  ResetPasswordRequestDto,
} from './dto/reset-password.dto';

function context(req: Request): RequestContext {
  const header = (name: string): string | null => {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : (value ?? null);
  };
  return {
    ip: req.ip ?? null,
    userAgent: header('user-agent'),
    deviceId: header('x-device-id'),
    deviceLabel: header('x-device-label'),
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Version('1')
  @HttpCode(201)
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, context(req));
  }

  @Post('login')
  @Version('1')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, context(req));
  }

  @Post('refresh')
  @Version('1')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, context(req));
  }

  @Post('logout')
  @Version('1')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logout(
    @Body() dto: LogoutDto,
    @CurrentUser('id') id: string,
    @Req() req: Request,
  ) {
    return this.auth.logout(dto.refreshToken, id, context(req));
  }

  @Post('logout-all')
  @Version('1')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logoutAll(@CurrentUser('id') id: string, @Req() req: Request) {
    return this.auth.logoutAll(id, context(req));
  }

  @Get('session')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  session(@CurrentUser() user: unknown) {
    return { user };
  }

  @Post('exchange')
  @Version('1')
  @HttpCode(200)
  @UseGuards(FlexAuthGuard)
  @ApiBearerAuth()
  exchange(@CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.auth.exchangeToken(user, context(req));
  }

  @Post('password/reset-request')
  @Version('1')
  @HttpCode(202)
  resetRequest(@Body() dto: ResetPasswordRequestDto, @Req() req: Request) {
    return this.auth.requestPasswordReset(dto.email, context(req));
  }

  @Post('password/reset')
  @Version('1')
  @HttpCode(200)
  reset(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.auth.resetPassword(dto, context(req));
  }

  @Get('profile')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  profile(@CurrentUser('id') id: string) {
    return this.auth.getProfile(id);
  }
}
