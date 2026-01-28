import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { MessagesService } from './message.service';
import { CreateMessageDto } from './dto/msgdto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import axios from 'axios';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('sendmessage')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: diskStorage({
        destination: './uploads/messages',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async create(
    @Body() dto: CreateMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const attachments = files?.map(
      (file) => `/uploads/messages/${file.filename}`,
    );

    const message = await this.messagesService.create({
      ...dto,
      attachments,
      image: attachments?.[0],
    });

    return message;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMessageDto) {
    return this.messagesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.messagesService.remove(id);
  }
  @Get('chat/:chatId')
  findByChatId(@Param('chatId') chatId: string) {
    return this.messagesService.findByChatId(chatId);
  }
}
