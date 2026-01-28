import { UserProfile } from "@/types/auth";

export type CaseStatus =
  | "declined"
  | "active"
  | "in_progress"

export interface CaseSummary {
  _id: string;
  title: string;
  clientName?: string; // Made optional since API doesn't always return it
  clientId?:
    | string
    | {
        _id: string;
        email?: string;
        profile?: UserProfile;
      }; // Added to CaseSummary
  client?: {
    _id?: string;
    name?: string;
    fullName?: string;
    username?: string;
    email?: string;
    profile?: UserProfile;
  };
  status: CaseStatus;
  description?: string; // Added to CaseSummary since incoming cases have it
  nextHearingDate?: string;
  createdAt?: string;
}

export interface CaseDetail extends CaseSummary {
  courtName?: string;
  opponent?: string;
  lawyerIds?: Array<string | { _id: string }>;
  preferredLawyerId?: string | { _id: string };
  lawyerFee?: number;
  documents?: Array<{
    _id?: string;
    fileName?: string;
    originalName?: string;
    fileUrl?: string;
    fileType?: string;
    uploadedAt?: string;
  }>;
  status: CaseStatus;
}

export interface CaseResponseDto {
  action: "accept" | "decline";
  fee?: number;
  reason?: string;
}
