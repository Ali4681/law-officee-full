// src/court/court.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Court, CourtSchema } from './court.schema';
import { CourtService } from './court.service';
import { CourtController } from './court.controller';
import { User, UserSchema } from '../users/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Court.name, schema: CourtSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CourtController],
  providers: [CourtService],
  exports: [CourtService],
})
export class CourtModule {}
