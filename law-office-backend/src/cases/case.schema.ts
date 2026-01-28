// src/cases/case.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CaseDocument = Case & Document;

@Schema({ timestamps: true })
export class Case {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  lawyerIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  preferredLawyerId?: Types.ObjectId;

  @Prop({ type: Number, required: false })
  lawyerFee?: number;

  @Prop({
    enum: [
      'pending',
      'info_requested',
      'declined',
      'fee_proposed',
      'active',
      'in_progress',
      'closed',
      'client_rejected',
    ],
    default: 'pending',
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Court', required: false })
  court?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Document' }], default: [] })
  documents: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Hearing' }], default: [] })
  hearings: Types.ObjectId[];

  @Prop({ type: Date })
  requestedAt?: Date;

  @Prop({ type: Date })
  acceptedAt?: Date;

  @Prop({ type: Date })
  clientResponseAt?: Date;

  @Prop()
  clientResponseNote?: string;
}

export const CaseSchema = SchemaFactory.createForClass(Case);

// Indexes for queries
CaseSchema.index({ clientId: 1, status: 1 });
CaseSchema.index({ lawyerIds: 1, status: 1 });
CaseSchema.index({ status: 1, requestedAt: -1 });
