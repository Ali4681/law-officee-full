import { IsMongoId, IsString, IsOptional, IsDateString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateHearingDto {
  @IsMongoId()
  caseId: string;

  @IsMongoId()
  @IsOptional()
  clientId?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  result?: string;
}

export class UpdateHearingDto extends PartialType(CreateHearingDto) {}
