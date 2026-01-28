export type UserRole = 'client' | 'lawyer' | 'staff' | 'admin' | string;

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type Profile = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type User = {
  id: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  profile?: Profile;
};

export type Credentials = {
  email: string;
  password: string;
};

export type SignupPayload = Credentials & {
  role?: UserRole;
  avatarUrl?: string;
  profile?: Profile;
};

export type AuthResponse = {
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  [key: string]: unknown;
};
