import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HearingDocument = Hearing & Document;

@Schema({ timestamps: true })
export class Hearing {
  @Prop({ type: Types.ObjectId, ref: 'Case', required: true })
  caseId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop()
  location: string;

  @Prop()
  notes: string;

  @Prop()
  result: string;
}

export const HearingSchema = SchemaFactory.createForClass(Hearing);
HearingSchema.index({ caseId: 1, date: 1, location: 1 }, { unique: true });
