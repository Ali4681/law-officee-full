import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat, ChatDocument } from './chat.schema';
import { CreateChatDto } from './dto/chatdto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/user.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    private usersService: UsersService,
  ) {}

  async create(dto: CreateChatDto) {
    const { user1Id, user2Id } = dto;

    const existingChat = await this.chatModel.findOne({
      $or: [
        { user1Id, user2Id },
        { user1Id: user2Id, user2Id: user1Id },
      ],
    });

    if (existingChat) {
      return existingChat;
    }

    const created = new this.chatModel(dto);
    return created.save();
  }

  async findAll(userId: string) {
    const chats = await this.chatModel
      .find({
        $or: [{ user1Id: userId }, { user2Id: userId }],
      })
      .sort({ updatedAt: -1 })
      .exec();

    const otherIds = chats
      .map((chat) => (chat.user1Id === userId ? chat.user2Id : chat.user1Id))
      .filter(Boolean);

    const uniqueIds = Array.from(new Set(otherIds));
    const users: UserDocument[] = await this.usersService.findByIds(uniqueIds);
    const userMap = new Map(
      users.map((user) => [user.id, user]),
    );

    return chats.map((chat) => {
      const otherId =
        chat.user1Id === userId ? chat.user2Id : chat.user1Id;
      const otherUser = userMap.get(otherId) ?? null;
      return {
        ...chat.toObject(),
        otherUser: {
          id: otherId,
          name:
            otherUser?.profile?.firstName ||
            otherUser?.profile?.lastName
              ? `${otherUser.profile?.firstName ?? ''} ${otherUser.profile?.lastName ?? ''}`.trim()
              : otherUser?.email ?? 'User',
        },
      };
    });
  }

  async findOne(id: string) {
    const chat = await this.chatModel.findById(id).exec();
    if (!chat) throw new NotFoundException(`Chat with ID ${id} not found`);
    return chat;
  }

  async update(id: string, dto: UpdateChatDto) {
    const updated = await this.chatModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Chat with ID ${id} not found`);
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.chatModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`Chat with ID ${id} not found`);
    return deleted;
  }
}
