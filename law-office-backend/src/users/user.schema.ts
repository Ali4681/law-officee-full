// src/users/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from './DTO/user.dto';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: Object.values(UserRole), required: true })
  role: UserRole;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  })
  verificationStatus: 'pending' | 'approved' | 'rejected';

  @Prop()
  certificateUrl?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ type: [String], default: [] })
  specialization: string[];

  @Prop({
    type: {
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    required: true,
    default: {},
  })
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };

  @Prop({ type: [String], default: [] })
  deviceTokens: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
