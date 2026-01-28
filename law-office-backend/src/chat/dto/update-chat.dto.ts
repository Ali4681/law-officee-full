import { PartialType } from '@nestjs/mapped-types';
import { CreateChatDto } from './chatdto';

export class UpdateChatDto extends PartialType(CreateChatDto) {}
