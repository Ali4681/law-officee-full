// src/users/DTO/user.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

export enum UserRole {
  LAWYER = 'lawyer',
  CLIENT = 'client',
  ADMIN = 'admin',
}

// Nested profile DTO
export class ProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

// Create user DTO
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  verificationStatus?: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialization?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileDto)
  profile?: ProfileDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deviceTokens?: string[];
}

// Update user DTO
export class UpdateUserDto extends PartialType(CreateUserDto) {}
