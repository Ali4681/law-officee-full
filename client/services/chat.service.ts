import { apiFetch, API_BASE_URL } from "@/services/api";
import type { ChatSummary, Message } from "@/types/chat";

export const ChatService = {
  async create(user1Id: string, user2Id: string): Promise<ChatSummary> {
    return apiFetch<ChatSummary>("/chats/createchat", {
      method: "POST",
      body: { user1Id, user2Id },
    });
  },

  async listMine(): Promise<ChatSummary[]> {
    return apiFetch<ChatSummary[]>("/chats/getallchat", { method: "GET" });
  },

  async getMessages(chatId: string): Promise<Message[]> {
    return apiFetch<Message[]>(`/messages/chat/${chatId}`, { method: "GET" });
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
      formData.append("attachments", {
        uri: file.uri,
        name: file.name || `file-${Date.now()}`,
        type: file.type || "application/octet-stream",
      } as any);
    });

    return apiFetch<Message>("/messages/sendmessage", {
      method: "POST",
      body: formData,
    });
  },
};
