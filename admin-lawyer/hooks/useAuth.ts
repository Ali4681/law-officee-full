import { useMutation, useQuery } from "@tanstack/react-query";
import { AuthService } from "../services/auth.service";
import { LoginDto, SignupDto, User } from "../types/auth";

export const useLogin = () =>
  useMutation({
    mutationFn: (dto: LoginDto) => AuthService.login(dto),
  });

export const useSignup = () =>
  useMutation({
    mutationFn: (dto: SignupDto) => AuthService.signup(dto),
  });

export const useProfile = () =>
  useQuery<User>({
    queryKey: ["profile"],
    queryFn: () => AuthService.getProfile(),
  });

export const useUpdateProfile = () =>
  useMutation({
    mutationFn: (dto: Partial<User>) => AuthService.updateProfile(dto),
  });

export const useLogout = () =>
  useMutation({
    mutationFn: () => AuthService.logout(),
  });

export const useRegisterDeviceToken = () =>
  useMutation({
    mutationFn: (dto: { deviceToken: string }) =>
      AuthService.registerDeviceToken(dto),
  });
