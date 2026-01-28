import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ChatService } from "@/services/chat.service";
import type { ChatSummary, Message } from "@/types/chat";

export const useChats = () =>
  useQuery<ChatSummary[]>({
    queryKey: ["chats"],
    queryFn: () => ChatService.listMine(),
  });

export const useMessages = (chatId?: string) =>
  useQuery<Message[]>({
    queryKey: ["messages", chatId],
    queryFn: () => ChatService.getMessages(chatId as string),
    enabled: Boolean(chatId),
  });

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: {
      chatId: string;
      senderId: string;
      receiverId: string;
      content?: string;
      attachments?: Array<{ uri: string; name: string; type?: string | null }>;
    }) => ChatService.sendMessage(dto),
    onSuccess: (_data, dto) => {
      queryClient.invalidateQueries({ queryKey: ["messages", dto.chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};
