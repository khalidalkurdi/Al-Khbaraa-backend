import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'تم تسجيل الدخول بنجاح وإرجاع رمزي الوصول والتحديث',
  })
  @ApiResponse({ status: 401, description: 'بيانات الاعتماد غير صالحة' })
  async login(@Request() req: { user: any }, @Body() loginDto: LoginDto) {
    return this.authService.login(req.user, loginDto.tokenDevice);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate JWT access and refresh tokens' })
  @ApiResponse({ status: 200, description: 'تم تحديث الرموز بنجاح' })
  @ApiResponse({ status: 401, description: 'رمز التحديث غير صالح أو ملغى' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({
    status: 200,
    description: 'تم إلغاء رمز التحديث بنجاح',
  })
  @ApiResponse({
    status: 400,
    description: 'Refresh token مطلوب أو غير صالح',
  })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refreshToken);
    return { message: 'تم تسجيل الخروج بنجاح' };
  }
}
