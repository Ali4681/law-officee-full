import { apiFetch } from './api';
import type { NotificationItem } from '@/types/notification';

export const NotificationService = {
  async list(userId: string): Promise<NotificationItem[]> {
    return apiFetch<NotificationItem[]>(`/notifications/user/${userId}`, {
      method: 'GET',
    });
  },

  async listUnread(userId: string): Promise<NotificationItem[]> {
    return apiFetch<NotificationItem[]>(`/notifications/user/${userId}/unread`, {
      method: 'GET',
    });
  },

  async markAsRead(id: string): Promise<void> {
    await apiFetch(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllAsRead(userId: string): Promise<void> {
    await apiFetch(`/notifications/user/${userId}/read-all`, {
      method: 'PATCH',
    });
  },

  async remove(id: string): Promise<void> {
    await apiFetch(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  async deleteMany(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.remove(id)));
  },
};
