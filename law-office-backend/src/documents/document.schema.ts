import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DocumentEntity = DocumentModel & Document;

@Schema({ timestamps: true })
export class DocumentModel {
  @Prop({ type: Types.ObjectId, ref: 'Case', required: true })
  caseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploaderId: Types.ObjectId;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ required: true })
  fileType: string; // pdf, docx, jpg, png...

  @Prop({ type: Object, default: null })
  extractedData?: Record<string, any>;

  @Prop({ type: String, required: false })
  documentType?: string;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentModel);
