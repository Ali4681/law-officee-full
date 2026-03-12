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
  ConflictException,
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
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        }
      },
    }),
  )
  async signup(
    @Body() body: any,
    @UploadedFile() certificate?: Express.Multer.File,
  ) {
    console.log('📥 Received signup request:', {
      email: body.email,
      role: body.role,
      hasCertificate: !!certificate,
      bodyKeys: Object.keys(body),
    });

    try {
      // Parse FormData fields
      const createUserDto: CreateUserDto = {
        email: body.email,
        password: body.password,
        role: body.role,
      };

      // Parse specialization (sent as JSON string)
      if (body.specialization) {
        try {
          createUserDto.specialization = JSON.parse(body.specialization);
        } catch (e) {
          console.error('Failed to parse specialization:', e);
        }
      }

      // Parse profile (sent as JSON string)
      if (body.profile) {
        try {
          createUserDto.profile = JSON.parse(body.profile);
          console.log('📝 Parsed profile:', createUserDto.profile);
        } catch (e) {
          console.error('Failed to parse profile:', e);
        }
      }

      // Validate lawyer requirements
      const isLawyer = createUserDto.role === 'lawyer';
      if (isLawyer && !certificate) {
        throw new BadRequestException('Certificate is required for lawyers');
      }

      const certificateUrl = certificate
        ? `/uploads/certificates/${certificate.filename}`
        : undefined;

      const result = await this.authService.signup({
        ...createUserDto,
        certificateUrl,
      });

      console.log('✅ Signup successful, returning tokens');
      return result;
    } catch (error) {
      // ✅ Handle duplicate email error
      if (error.code === 11000) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
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
    console.log('Refresh endpoint hit');
    const user = req.user;
    console.log('Payload from strategy:', user);
    return this.authService.refreshTokens(user.sub, user.role);
  }
}
