import { IsOptional, IsString, IsArray } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  senderId: string;

  @IsString()
  receiverId: string;

  @IsString()
  chatId: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  image?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
