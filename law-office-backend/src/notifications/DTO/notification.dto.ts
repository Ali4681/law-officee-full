import {
  IsMongoId,
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateNotificationDto {
  @IsMongoId()
  userId: string;

  @IsString()
  type: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsBoolean()
  read?: boolean;

  // 🔹 Strongly-typed relations
  @IsOptional()
  @IsMongoId()
  caseId?: string;

  @IsOptional()
  @IsMongoId()
  hearingId?: string;

  @IsOptional()
  @IsMongoId()
  documentId?: string;

  // 🔹 Flexible metadata (deep links, custom info for push payloads)
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {}
