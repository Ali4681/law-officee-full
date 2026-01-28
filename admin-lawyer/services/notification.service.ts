import { NotificationItem } from "@/types/notification";
import { api } from "./api";

export const NotificationService = {
  async list(userId: string): Promise<NotificationItem[]> {
    const res = await api.get(`/notifications/user/${userId}`);
    return res.data;
  },

  async listUnread(userId: string): Promise<NotificationItem[]> {
    const res = await api.get(`/notifications/user/${userId}/unread`);
    return res.data;
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(userId: string): Promise<void> {
    await api.patch(`/notifications/user/${userId}/read-all`);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
