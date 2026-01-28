// src/court/court.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CourtDocument = Court & Document;

@Schema({ timestamps: true })
export class Court {
  @Prop({ required: true, unique: true })
  name: string;
}

export const CourtSchema = SchemaFactory.createForClass(Court);
