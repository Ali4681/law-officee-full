import { IsOptional, IsString } from 'class-validator';

export class UpdateCourtDto {
  @IsString()
  @IsOptional()
  name?: string;
}
