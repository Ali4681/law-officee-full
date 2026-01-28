export type NotificationItem = {
  _id: string;
  userId: string;
  type: string;
  message: string;
  read?: boolean;
  caseId?: string;
  hearingId?: string;
  documentId?: string;
  data?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};
