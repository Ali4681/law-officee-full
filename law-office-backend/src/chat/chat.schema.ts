import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatDocument = Chat & Document;

@Schema({ timestamps: true })
export class Chat {
  @Prop({ required: true })
  user1Id: string;

  @Prop({ required: true })
  user2Id: string;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
