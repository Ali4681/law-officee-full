import { apiFetch } from './api';
import { setAuthToken } from './api';
import type { AuthResponse, Credentials, SignupPayload } from '@/types/auth';

export async function login(credentials: Credentials) {
  const result = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });
  const token =
    result?.accessToken ??
    (result as any)?.token ??
    (result as any)?.access_token;
  if (typeof token === 'string') {
    setAuthToken(token);
  }
  return result;
}

export async function signup(payload: SignupPayload) {
  const result = await apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: {
      email: payload.email,
      password: payload.password,
      role: 'client',
      profile: payload.profile,
      avatarUrl: payload.avatarUrl,
    },
  });
  const token =
    result?.accessToken ??
    (result as any)?.token ??
    (result as any)?.access_token;
  if (typeof token === 'string') {
    setAuthToken(token);
  }
  return result;
}

export function signOut() {
  setAuthToken(null);
}
