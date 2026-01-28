// device-token.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeviceTokenDocument = DeviceToken & Document;

@Schema({ timestamps: true })
export class DeviceToken {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  token: string;

  @Prop({ enum: ['mobile', 'web'], required: true })
  type: 'mobile' | 'web';

  @Prop({
    enum: ['ios', 'android', 'chrome', 'firefox', 'safari'],
    required: false,
  })
  platform?: string;
}

export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);
