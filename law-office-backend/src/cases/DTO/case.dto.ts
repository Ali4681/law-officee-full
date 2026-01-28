// src/cases/DTO/case.dto.ts
import {
  IsString,
  IsOptional,
  IsArray,
  IsMongoId,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { Types } from 'mongoose';

// Client submits a case request
export class RequestCaseDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  @IsMongoId()
  court: string;

  @IsOptional()
  @IsString()
  preferredLawyerId?: string; // Optional: client can request a lawyer
}

export class AcceptCaseDto {
  @IsOptional()
  @IsNumber()
  @Min(0) 
  fee?: number;
}

export class DeclineCaseDto {
  @IsString()
  reason: string;
}

export class ClientFeeResponseDto {
  @IsBoolean()
  accept: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

// Lawyer/admin creates case directly
export class CreateCaseDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  clientId: string;

  @IsOptional()
  @IsArray()
  lawyerIds?: Types.ObjectId[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  court?: string;
}

// Update case DTO
export class UpdateCaseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsArray()
  lawyerIds?: Types.ObjectId[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  @IsMongoId()
  court?: string;
}
