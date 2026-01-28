import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationService } from "@/services/notification.service";
import { NotificationItem } from "@/types/notification";

export const useUnreadNotifications = (userId?: string) =>
  useQuery<NotificationItem[]>({
    queryKey: ["notifications", "unread", userId],
    queryFn: () => NotificationService.listUnread(userId as string),
    enabled: !!userId,
  });

export const useNotifications = (userId?: string) =>
  useQuery<NotificationItem[]>({
    queryKey: ["notifications", userId],
    queryFn: () => NotificationService.list(userId as string),
    enabled: !!userId,
  });

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => NotificationService.markAllAsRead(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread", userId],
      });
    },
  });
};

export const useMarkRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
