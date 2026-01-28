import { jwtDecode } from "jwt-decode";

export const API_BASE_URL = "http://192.168.1.228:3000";

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

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

type JwtPayload = {
  sub?: string;
  userId?: string;
  id?: string;
};

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

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  headers?: Record<string, string>;
  baseUrl?: string;
  body?: any;
};

export async function apiFetch<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
) {
  const { baseUrl = API_BASE_URL, headers, ...rest } = options;
  const body = options.body;
  const isFormData = body instanceof FormData;

  const response = await fetch(`${baseUrl}${path}`, {
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
    const message =
      typeof data === "string"
        ? data
        : ((data?.message as string) ?? "Request failed");
    throw new ApiError(message, response.status, data);
  }

  return data as TResponse;
}
