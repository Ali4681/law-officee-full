export interface ChatSummary {
  _id: string;
  user1Id: string;
  user2Id: string;
  otherUser: {
    id: string;
    name: string;
  };
  lastMessage?: string | Message;
  unreadCount?: number;
  updatedAt?: string;
}

export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  content?: string;
  image?: string;
  attachments?: string[];
  createdAt?: string;
}
