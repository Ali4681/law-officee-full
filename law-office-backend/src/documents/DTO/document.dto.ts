import { IsMongoId, IsString, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateDocumentDto {
  @IsMongoId()
  caseId: string;

  @IsMongoId()
  @IsOptional()
  uploaderId?: string;
  @IsOptional()
  @IsString()
  fileUrl?: string;
  @IsOptional()
  @IsString()
  fileType?: string;
  @IsOptional()
  extractedData?: Record<string, any>;
  @IsOptional()
  @IsString()
  documentType?: string;
}

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
