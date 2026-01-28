import { ChatSummary, Message } from "@/types/chat";
import { api } from "./api";

export const ChatService = {
  async create(user1Id: string, user2Id: string): Promise<ChatSummary> {
    const res = await api.post("/chats/createchat", { user1Id, user2Id });
    return res.data;
  },

  async listMine(): Promise<ChatSummary[]> {
    const res = await api.get("/chats/getallchat");
    return res.data;
  },

  async getMessages(chatId: string): Promise<Message[]> {
    const res = await api.get(`/messages/chat/${chatId}`);
    return res.data;
  },

  async sendMessage(dto: {
    chatId: string;
    senderId: string;
    receiverId: string;
    content?: string;
    attachments?: Array<{ uri: string; name: string; type?: string | null }>;
  }): Promise<Message> {
    const formData = new FormData();
    formData.append("chatId", dto.chatId);
    formData.append("senderId", dto.senderId);
    formData.append("receiverId", dto.receiverId);
    if (dto.content) formData.append("content", dto.content);

    dto.attachments?.forEach((file) => {
      formData.append(
        "attachments",
        {
          uri: file.uri,
          name: file.name || `file-${Date.now()}`,
          type: file.type || "application/octet-stream",
        } as any
      );
    });

    const res = await api.post("/messages/sendmessage", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};
