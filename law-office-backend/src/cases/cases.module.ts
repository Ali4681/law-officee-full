// src/cases/cases.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { Case, CaseSchema } from './case.schema';
import { Court, CourtSchema } from '../court/court.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Case.name, schema: CaseSchema },
      { name: Court.name, schema: CourtSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
