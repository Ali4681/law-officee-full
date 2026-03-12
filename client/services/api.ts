import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

export const API_BASE_URL = "http://192.168.1.151:3000";

const AUTH_TOKEN_KEY = "authToken";

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let authToken: string | null = null;
type AuthTokenListener = (token: string | null) => void;
const authTokenListeners = new Set<AuthTokenListener>();

function notifyAuthTokenListeners(token: string | null) {
  authTokenListeners.forEach((listener) => {
    try {
      listener(token);
    } catch (error) {
      console.error("Error in auth token listener:", error);
    }
  });
}

export function subscribeAuthToken(listener: AuthTokenListener) {
  authTokenListeners.add(listener);
  return () => {
    authTokenListeners.delete(listener);
  };
}

/**
 * Set the authentication token
 * Saves to both memory and AsyncStorage
 */
export async function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    console.log("✅ Token saved to AsyncStorage");
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    console.log("✅ Token removed from AsyncStorage");
  }
  notifyAuthTokenListeners(token);
}

/**
 * Get the current authentication token from memory
 */
export function getAuthToken() {
  return authToken;
}

/**
 * Load the authentication token from AsyncStorage
 * This should be called when the app starts
 */
export async function loadAuthToken() {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      authToken = token;
      console.log("✅ Token loaded from AsyncStorage");
      notifyAuthTokenListeners(token);
    } else {
      console.log("ℹ️ No token found in AsyncStorage");
      notifyAuthTokenListeners(null);
    }
    return token;
  } catch (error) {
    console.error("❌ Error loading auth token:", error);
    return null;
  }
}

type JwtPayload = {
  sub?: string;
  userId?: string;
  id?: string;
  exp?: number;
};

/**
 * Get the current user ID from the JWT token
 */
export function getCurrentUserId() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = jwtDecode<JwtPayload>(token);
    return payload.sub ?? payload.userId ?? payload.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if the current token is expired
 */
export function isTokenExpired() {
  const token = getAuthToken();
  if (!token) return true;

  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (!payload.exp) return false;

    // Check if token expires in the next 60 seconds
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();
    const isExpired = currentTime >= expirationTime - 60000;

    if (isExpired) {
      console.warn("⚠️ Token is expired or about to expire");
    }

    return isExpired;
  } catch (error) {
    console.error("❌ Error checking token expiration:", error);
    return true;
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  headers?: Record<string, string>;
  baseUrl?: string;
  body?: any;
};

/**
 * Make an API request with automatic token injection
 */
export async function apiFetch<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
) {
  const { baseUrl = API_BASE_URL, headers, ...rest } = options;
  const body = options.body;
  const isFormData = body instanceof FormData;

  // Check if token is expired before making the request
  if (authToken && isTokenExpired()) {
    console.warn("⚠️ Token expired, clearing auth");
    await setAuthToken(null);
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  const url = `${baseUrl}${path}`;
  console.log(`🌐 API Request: ${options.method ?? "GET"} ${url}`);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        Accept: "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type");
    const data =
      contentType && contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
      console.error(`❌ API Error ${response.status}:`, data);

      const message =
        typeof data === "string"
          ? data
          : ((data?.message as string) ?? "Request failed");

      throw new ApiError(message, response.status, data);
    }

    console.log(`✅ API Success: ${options.method ?? "GET"} ${url}`);
    return data as TResponse;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error("❌ Network error:", error);
    throw new ApiError(
      "Network error. Please check your connection.",
      0,
      error,
    );
  }
}
