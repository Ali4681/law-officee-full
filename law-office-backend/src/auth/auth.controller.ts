import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { CreateUserDto } from '../users/DTO/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UseInterceptors(
    FileInterceptor('certificate', {
      storage: diskStorage({
        destination: './uploads/certificates',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async signup(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() certificate?: Express.Multer.File,
  ) {
    const isLawyer = createUserDto.role === 'lawyer';
    if (isLawyer && !certificate) {
      throw new BadRequestException('Certificate is required for lawyers');
    }

    const certificateUrl = certificate
      ? `/uploads/certificates/${certificate.filename}`
      : undefined;

    return this.authService.signup({
      ...createUserDto,
      certificateUrl,
    });
  }

  @Post('login')
  async login(@Body() authDto: AuthDto) {
    const user = await this.authService.validateUser(
      authDto.email,
      authDto.password,
    );
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(@Req() req) {
    console.log('Refresh endpoint hit'); // should log now
    const user = req.user;
    console.log('Payload from strategy:', user);
    return this.authService.refreshTokens(user.sub, user.role);
  }
}
