// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './DTO/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { promises as fs } from 'fs';
import { join } from 'path';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles()
  async findAll() {
    return this.usersService.findAll();
  }

  // Admin: list pending lawyers
  @Get('lawyers/pending')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async listPendingLawyers() {
    return this.usersService.findPendingLawyers();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'client', 'staff')
  async findOne(@Param('id') id: string, @Req() req: any) {
    if (req.user.sub !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.findById(id);
  }

  // Admin/staff/lawyer lookup for any user by id (without self restriction)
  @Get('by-id/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'staff', 'lawyer')
  async findUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // Admin: approve lawyer
  @Put('lawyers/:id/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async approveLawyer(@Param('id') id: string) {
    return this.usersService.updateVerificationStatus(id, 'approved');
  }

  // Admin: reject lawyer (removes certificate URL)
  @Put('lawyers/:id/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async rejectLawyer(@Param('id') id: string) {
    return this.usersService.updateVerificationStatus(id, 'rejected', true);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'client', 'staff')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    if (req.user.sub !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    // Prevent phone/name change for lawyer/client
    if (
      updateUserDto.profile &&
      typeof updateUserDto.profile === 'object' &&
      ['lawyer', 'client'].includes(req.user.role)
    ) {
      if ('phone' in updateUserDto.profile) {
        delete (updateUserDto as any).profile.phone;
      }
      if ('firstName' in updateUserDto.profile) {
        delete (updateUserDto as any).profile.firstName;
      }
      if ('lastName' in updateUserDto.profile) {
        delete (updateUserDto as any).profile.lastName;
      }
    }
    return this.usersService.update(id, updateUserDto);
  }

  // Upload/Update avatar for user/client/lawyer
  @Put(':id/avatar')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'client', 'staff')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (req.user.sub !== id) {
      throw new ForbiddenException('You can only update your own avatar');
    }
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;
    return this.usersService.update(id, { avatarUrl });
  }

  // Remove avatar (reset to no image)
  @Delete(':id/avatar')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'client', 'staff')
  async deleteAvatar(@Param('id') id: string, @Req() req: any) {
    if (req.user.sub !== id) {
      throw new ForbiddenException('You can only update your own avatar');
    }

    const user = await this.usersService.findById(id);
    const currentAvatar = user.avatarUrl;

    const result = await this.usersService.update(id, {
      avatarUrl: null as any,
    });

    // Try to remove the old file from disk (best effort)
    if (currentAvatar) {
      const relative = currentAvatar.replace(/^\/+/, '');
      const fullPath = join(process.cwd(), relative);
      fs.unlink(fullPath).catch(() => undefined);
    }

    return result;
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles()
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post('register-token')
  async registerToken(
    @Body()
    body: {
      userId: string;
      deviceToken: string;
      platform?: string;
      deviceId?: string;
    },
  ) {
    return this.usersService.updateDeviceToken(body.userId, body.deviceToken);
  }

  @Post('device-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'client', 'staff')
  async registerDeviceToken(
    @Req() req: any,
    @Body()
    body: {
      deviceToken: string;
      platform?: string;
      deviceId?: string;
    },
  ) {
    const userId = req.user.sub;
    return this.usersService.updateDeviceToken(userId, body.deviceToken);
  }

  @Put(':id/device-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'client', 'staff')
  async updateDeviceToken(
    @Param('id') id: string,
    @Body('deviceToken') deviceToken: string,
    @Req() req: any,
  ) {
    if (req.user.sub !== id) {
      throw new ForbiddenException(
        'You can only update your own device tokens',
      );
    }
    return this.usersService.updateDeviceToken(id, deviceToken);
  }

  @Delete('device-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'client', 'staff')
  async removeDeviceToken(
    @Req() req: any,
    @Body('deviceToken') deviceToken: string,
  ) {
    const userId = req.user.sub;
    return this.usersService.removeDeviceToken(userId, deviceToken);
  }

  @Delete(':id/device-token')
  async removeDeviceTokenPublic(
    @Param('id') userId: string,
    @Body('deviceToken') deviceToken: string,
  ) {
    return this.usersService.removeDeviceToken(userId, deviceToken);
  }

  @Delete('device-tokens/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'client', 'staff')
  async removeAllDeviceTokens(@Req() req: any) {
    const userId = req.user.sub;
    return this.usersService.removeAllDeviceTokens(userId);
  }

  @Get('device-tokens')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'client', 'staff')
  async getDeviceTokens(@Req() req: any) {
    const userId = req.user.sub;
    const tokens = await this.usersService.getDeviceTokens(userId);
    return { tokens, count: tokens.length };
  }

  @Get(':id/device-tokens')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles()
  async getUserDeviceTokens(@Param('id') id: string) {
    const tokens = await this.usersService.getDeviceTokens(id);
    return { tokens, count: tokens.length };
  }
}
