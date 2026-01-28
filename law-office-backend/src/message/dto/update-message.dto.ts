import { PartialType } from '@nestjs/mapped-types';
import { CreateMessageDto } from './msgdto';

export class UpdateMessageDto extends PartialType(CreateMessageDto) {}
