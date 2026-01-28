import { IsString } from 'class-validator';

export class CreateCourtDto {
  @IsString()
  name: string;
}