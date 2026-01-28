import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { NotificationService } from '@/services/notification';
import { getCurrentUserId } from '@/services/api';
import type { NotificationItem } from '@/types/notification';

const notificationsKey = (userId?: string | null) =>
  userId ? ['notifications', userId] : ['notifications'];
const unreadNotificationsKey = (userId?: string | null) =>
  userId ? ['notifications', 'unread', userId] : ['notifications', 'unread'];

export function useNotifications() {
  const userId = getCurrentUserId();
  return useQuery<NotificationItem[]>({
    queryKey: notificationsKey(userId),
    queryFn: () => NotificationService.list(userId as string),
    enabled: Boolean(userId),
  });
}

export function useUnreadNotifications() {
  const userId = getCurrentUserId();
  return useQuery<NotificationItem[]>({
    queryKey: unreadNotificationsKey(userId),
    queryFn: () => NotificationService.listUnread(userId as string),
    enabled: Boolean(userId),
  });
}

export function useMarkNotificationAsRead() {
  const userId = getCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey(userId) });
      queryClient.invalidateQueries({
        queryKey: unreadNotificationsKey(userId),
      });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const userId = getCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      userId ? NotificationService.markAllAsRead(userId) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey(userId) });
      queryClient.invalidateQueries({
        queryKey: unreadNotificationsKey(userId),
      });
    },
  });
}

export function useDeleteNotification() {
  const userId = getCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => NotificationService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey(userId) });
      queryClient.invalidateQueries({
        queryKey: unreadNotificationsKey(userId),
      });
    },
  });
}

export function useDeleteNotifications() {
  const userId = getCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => NotificationService.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey(userId) });
      queryClient.invalidateQueries({
        queryKey: unreadNotificationsKey(userId),
      });
    },
  });
}
