import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // Who receives the notification

  @Prop({ required: true })
  type: string; // case_updated | hearing_added | document_uploaded | etc.

  @Prop({ required: true })
  message: string; // Human-readable message

  @Prop({ default: false })
  read: boolean;

  // 🔹 Relational references (optional, depending on notification type)
  @Prop({ type: Types.ObjectId, ref: 'Case', required: false })
  caseId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hearing', required: false })
  hearingId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Document', required: false })
  documentId?: Types.ObjectId;
  @Prop({ type: Object, required: false })
  data?: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
