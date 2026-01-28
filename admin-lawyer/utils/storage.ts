import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  TOKEN: "auth_token",
  REFRESH_TOKEN: "refresh_token",
  USER_ID: "user_id",
  USER_ROLE: "user_role",
};

export const storage = {
  // Token management
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  // User data management
  async setUserData(userData: { id: string; role: string }): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userData.id);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, userData.role);
  },

  async getUserData(): Promise<{ id: string | null; role: string | null }> {
    const [id, role] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
      AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE),
    ]);
    return { id, role };
  },

  // Clear all auth data
  async clearAuthData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE),
    ]);
  },
};
