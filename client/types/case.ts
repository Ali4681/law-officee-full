export type CaseStatus =
  | 'pending'
  | 'info_requested'
  | 'fee_proposed'
  | 'client_rejected'
  | 'active'
  | 'in_progress'
  | 'declined'
  | 'open'
  | 'closed'
  | string;

import type { ChatSummary } from "@/types/chat";

export type CaseSummary = {
  _id: string;
  title: string;
  description?: string;
  status?: CaseStatus;
  clientId?: string;
  court?: string | { _id?: string; name?: string };
  chatId?: string;
  chat?: ChatSummary;
  lawyerId?: string;
  assignedLawyerId?: string;
  preferredLawyerId?: string;
  lawyer?: { _id?: string };
  createdAt?: string;
  updatedAt?: string;
};
