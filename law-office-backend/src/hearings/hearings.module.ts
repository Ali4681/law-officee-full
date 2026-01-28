// src/hearings/hearings.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HearingsController } from './hearings.controller';
import { HearingsService } from './hearings.service';
import { Hearing, HearingSchema } from './hearing.schema';
import { CasesModule } from '../cases/cases.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Hearing.name, schema: HearingSchema }]),
    forwardRef(() => CasesModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [HearingsController],
  providers: [HearingsService],
  exports: [HearingsService],
})
export class HearingsModule {}
