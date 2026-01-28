import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule'; // TODO: keeps cron alive
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CasesModule } from './cases/cases.module';
import { HearingsModule } from './hearings/hearings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocumentsModule } from './documents/documents.module';
import { ConfigModule } from '@nestjs/config';
import { OcrModule } from './ocr/ocr.module';
import { ChatModule } from './chat/chat.module';
import { MessagesModule } from './message/message.module';
import { CourtModule } from './court/court.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // TODO: keep cron jobs alive
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/lawoffice',
    ),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UsersModule,
    AuthModule,
    CasesModule,
    HearingsModule,
    NotificationsModule,
    DocumentsModule,
    OcrModule,
    ChatModule,
    MessagesModule,
    CourtModule,
  ],
})
export class AppModule {}
