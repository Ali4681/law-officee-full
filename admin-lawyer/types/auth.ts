export type UserRole = "admin" | "lawyer" | "client";

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface User {
  _id: string;
  email: string;
  role: UserRole;
  specialization?: string;
  profile?: UserProfile;
  deviceTokens?: string[];
  verificationStatus?: "pending" | "approved" | "rejected";
  certificateUrl?: string;
  avatarUrl?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse extends AuthTokens {
  id: string;
  role: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface SignupDto {
  email: string;
  password: string;
  role: UserRole;
  specialization?: string;
  profile?: UserProfile;
  certificateUrl?: string;
}

export interface RegisterDeviceTokenDto {
  deviceToken: string;
  deviceId?: string;
  platform?: string;
}
