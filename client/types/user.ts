import type { Profile, UserRole, VerificationStatus } from '@/types/auth';

export type UserProfile = {
  _id: string;
  id?: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  certificateUrl?: string | null;
  verificationStatus?: VerificationStatus;
  specialization?: string[];
  profile?: Profile;
  deviceTokens?: string[];
};
