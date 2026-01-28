import { useMutation } from '@tanstack/react-query';

import { login, signup } from '@/services/auth';
import type { Credentials, SignupPayload, AuthResponse } from '@/types/auth';

export function useLogin() {
  return useMutation<AuthResponse, Error, Credentials>({
    mutationFn: login,
  });
}

export function useSignup() {
  return useMutation<AuthResponse, Error, SignupPayload>({
    mutationFn: signup,
  });
}
