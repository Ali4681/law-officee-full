import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LoginDto,
  LoginResponse,
  RegisterDeviceTokenDto,
  SignupDto,
  User,
} from "../types/auth";
import { api } from "./api";

export const AuthService = {
  async login(dto: LoginDto): Promise<LoginResponse> {
    const res = await api.post("/auth/login", dto);
    const data = res.data;

    await AsyncStorage.setItem("access_token", data.access_token);
    await AsyncStorage.setItem("refresh_token", data.refresh_token);
    await AsyncStorage.setItem("user_id", data.id);
    await AsyncStorage.setItem("role", data.role);

    return data;
  },

  async signup(
    dto: SignupDto & {
      certificateFile?: { uri: string; name: string; type?: string | null };
    }
  ): Promise<User> {
    const formData = new FormData();
    formData.append("email", dto.email);
    formData.append("password", dto.password);
    formData.append("role", dto.role);

    if (dto.specialization && dto.specialization.trim().length > 0) {
      formData.append("specialization", dto.specialization.trim());
    }

    if (dto.profile) {
      if (dto.profile.firstName) {
        formData.append("profile[firstName]", dto.profile.firstName);
      }
      if (dto.profile.lastName) {
        formData.append("profile[lastName]", dto.profile.lastName);
      }
      if (dto.profile.phone) {
        formData.append("profile[phone]", dto.profile.phone);
      }
    }

    if (dto.certificateFile) {
      formData.append("certificate", {
        uri: dto.certificateFile.uri,
        name:
          dto.certificateFile.name?.length > 0
            ? dto.certificateFile.name
            : `certificate-${Date.now()}.pdf`,
        type: dto.certificateFile.type || "application/octet-stream",
      } as any);
    } else if (dto.role === "lawyer") {
      throw new Error("Certificate is required for lawyer signup.");
    }

    const res = await api.post("/auth/signup", formData);
    return res.data;
  },

  async getProfile(): Promise<User> {
    const userId = await AsyncStorage.getItem("user_id");
    const res = await api.get(`/users/${userId}`);
    return res.data;
  },

  async getUserById(userId: string): Promise<User> {
    const res = await api.get(`/users/${userId}`);
    return res.data;
  },

  async updateProfile(update: Partial<User>): Promise<User> {
    const id = await AsyncStorage.getItem("user_id");
    const role = await AsyncStorage.getItem("role");

    const payload = { ...update };
    if (role === "lawyer" || role === "client") {
      if (payload.profile) {
        const filteredProfile = { ...payload.profile };
        delete (filteredProfile as any).firstName;
        delete (filteredProfile as any).lastName;
        delete (filteredProfile as any).phone;
        payload.profile = filteredProfile;
      }
    }

    const res = await api.put(`/users/${id}`, payload);
    return res.data;
  },

  async uploadAvatar(file: { uri: string; name: string; type?: string | null }) {
    const id = await AsyncStorage.getItem("user_id");
    const formData = new FormData();
    formData.append("avatar", {
      uri: file.uri,
      name: file.name || `avatar-${Date.now()}.jpg`,
      type: file.type || "image/jpeg",
    } as any);
    const res = await api.put(`/users/${id}/avatar`, formData);
    return res.data;
  },

  async deleteAvatar(): Promise<void> {
    const id = await AsyncStorage.getItem("user_id");
    await api.delete(`/users/${id}/avatar`);
  },

  async logout() {
    const userId = await AsyncStorage.getItem("user_id");
    const token = await AsyncStorage.getItem("device_token");

    if (userId && token) {
      await api.delete(`/users/device-token`, {
        data: { deviceToken: token },
      });
    }

    await AsyncStorage.clear();
  },

  async registerDeviceToken(dto: RegisterDeviceTokenDto) {
    return api.post("/users/device-token", dto);
  },
};
