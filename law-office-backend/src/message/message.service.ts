import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument, MessageSchema } from './message.schema';
import { CreateMessageDto } from './dto/msgdto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { log } from 'console';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async create(dto: CreateMessageDto) {
    const created = new this.messageModel(dto);
    console.log(created);
    
    return created.save();
  }

  async findAll() {
    return this.messageModel.find().exec();
  }

  async findOne(id: string) {
    const message = await this.messageModel.findById(id).exec();
    if (!message)
      throw new NotFoundException(`Message with ID ${id} not found`);
    return message;
  }

  async update(id: string, dto: UpdateMessageDto) {
    const updated = await this.messageModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated)
      throw new NotFoundException(`Message with ID ${id} not found`);
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.messageModel.findByIdAndDelete(id).exec();
    if (!deleted)
      throw new NotFoundException(`Message with ID ${id} not found`);
    return deleted;
  }
  async findByChatId(chatId: string) {
    return this.messageModel
      .find({ chatId })
      .sort({ createdAt: 1 })
      .exec();
  }
}
