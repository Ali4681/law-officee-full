// src/notifications/notifications.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  Patch,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationDto } from './DTO/notification.dto';
import { TokenCleanupService } from './token-cleanup.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly tokenCleanupService: TokenCleanupService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async create(@Body() createDto: CreateNotificationDto) {
    const notification = await this.notificationsService.create(createDto);
    this.notificationsGateway.sendNotification(createDto.userId, notification);
    return notification;
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff', 'client')
  async findAllForUser(@Param('userId') userId: string, @Req() req: any) {
    if (req.user.sub !== userId) {
      throw new ForbiddenException('You can only view your own notifications');
    }
    return this.notificationsService.findAllForUser(userId);
  }

  @Get('user/:userId/unread')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff', 'client')
  async findUnreadForUser(@Param('userId') userId: string, @Req() req: any) {
    if ( req.user.sub !== userId) {
      throw new ForbiddenException('You can only view your own notifications');
    }
    return this.notificationsService.findUnreadForUser(userId);
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff', 'client')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const notification = await this.notificationsService.findOne(id);
    if (

      notification.userId.toString() !== req.user.sub
    ) {
      throw new ForbiddenException('You can only mark your own notifications');
    }
    return this.notificationsService.markAsRead(id);
  }

  @Patch('user/:userId/read-all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff', 'client')
  async markAllAsReadForUser(@Param('userId') userId: string, @Req() req: any) {
    if ( req.user.sub !== userId) {
      throw new ForbiddenException('You can only mark your own notifications');
    }
    return this.notificationsService.markAllAsReadForUser(userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff', 'client')
  async remove(@Param('id') id: string, @Req() req: any) {
    const notification = await this.notificationsService.findOne(id);
    if (
      
      notification.userId.toString() !== req.user.sub
    ) {
      throw new ForbiddenException(
        'You can only delete your own notifications',
      );
    }
    return this.notificationsService.remove(id);
  }

  @Post('test-push')
  @UseGuards(AuthGuard('jwt'), RolesGuard)

  async testPush(@Body() body: { userId: string }) {
    return this.notificationsService.sendToUser(
      body.userId,
      'test',
      'Hello from your backend! This is working',
    );
  }

  @Post('cleanup-tokens')
  @UseGuards(AuthGuard('jwt'), RolesGuard)

  async manualCleanup() {
    const result = await this.tokenCleanupService.triggerManualCleanup();
    return {
      message: 'Cleanup completed',
      ...result,
    };
  }

  @Get('invalid-tokens-count')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles()
  async getInvalidTokenCount() {
    const count = this.tokenCleanupService.getInvalidTokenCount();
    return {
      count,
      message: `${count} token(s) marked for cleanup`,
    };
  }
}
