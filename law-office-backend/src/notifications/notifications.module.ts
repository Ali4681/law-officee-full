import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { Notification, NotificationSchema } from './notification.schema';
import { UsersModule } from '../users/users.module';
import { PushService } from './push.service';
import { TokenCleanupService } from './token-cleanup.service';
import { OcrModule } from 'src/ocr/ocr.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    forwardRef(() => UsersModule), // circular dependency
    forwardRef(() => OcrModule), // optional
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    PushService,
    TokenCleanupService,
  ],
  exports: [NotificationsService, TokenCleanupService],
})
export class NotificationsModule {}
