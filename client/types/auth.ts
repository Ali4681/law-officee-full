export type UserRole = "client" | "lawyer" | "staff" | "admin" | string;

export type VerificationStatus = "pending" | "approved" | "rejected";

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

// ✅ Updated to match backend response exactly
export type AuthResponse = {
  user?: User;
  // Backend returns these fields (snake_case)
  access_token?: string;
  refresh_token?: string;
  id?: string;
  role?: string;
  // Also support camelCase for flexibility
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  [key: string]: unknown;
};
