import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_URL = "http://172.20.10.2:3000";

export const api = axios.create({
  baseURL: API_URL,
});

// Attach access token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refresh_token = await AsyncStorage.getItem("refresh_token");
      if (!refresh_token) return Promise.reject(error);

      try {
        const res = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            headers: { Authorization: `Bearer ${refresh_token}` },
          },
        );

        const { access_token, refresh_token: newRefresh } = res.data;

        await AsyncStorage.setItem("access_token", access_token);
        await AsyncStorage.setItem("refresh_token", newRefresh);

        original.headers.Authorization = `Bearer ${access_token}`;
        return api(original);
      } catch (err) {
        await AsyncStorage.clear();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);
