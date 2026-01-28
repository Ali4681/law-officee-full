import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/chatdto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { currentUser } from 'src/auth/decorator/current.user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { log } from 'console';

@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('createchat')
  create(@Body() dto: CreateChatDto) {
    return this.chatService.create(dto);
  }

  @Get('getallchat')
  @UseGuards(JwtAuthGuard)
  findAll(@currentUser() user) {
    const userId = user.sub;

    return this.chatService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChatDto) {
    return this.chatService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chatService.remove(id);
  }
}
