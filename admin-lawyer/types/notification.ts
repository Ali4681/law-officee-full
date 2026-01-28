export interface NotificationItem {
  _id: string;
  userId: string;
  type: string;
  message: string;
  read?: boolean;
  caseId?: string;
  data?: Record<string, any>;
  createdAt?: string;
}
