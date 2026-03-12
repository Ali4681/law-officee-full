import type { AuthResponse, Credentials, SignupPayload } from "@/types/auth";
import { apiFetch, setAuthToken } from "./api";

export async function login(credentials: Credentials) {
  const result = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: credentials,
  });

  console.log("📥 Login response:", result);

  // ✅ Check all possible token field names (backend uses snake_case)
  const token = result?.access_token ?? result?.accessToken ?? result?.token;

  if (typeof token === "string") {
    await setAuthToken(token);
    console.log("✅ Token saved successfully");
  } else {
    console.error("❌ No token received from server. Response:", result);
    throw new Error("No authentication token received");
  }

  return result;
}

export async function signup(payload: SignupPayload) {
  console.log("📤 Signup request:", {
    email: payload.email,
    role: payload.role,
    hasProfile: !!payload.profile,
    profileKeys: payload.profile ? Object.keys(payload.profile) : [],
  });

  // ✅ Send data as JSON (not FormData for client signup)
  const result = await apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: {
      email: payload.email,
      password: payload.password,
      role: payload.role || "client",
      // Only send profile if it has data
      ...(payload.profile && Object.keys(payload.profile).length > 0
        ? { profile: JSON.stringify(payload.profile) }
        : {}),
    },
  });

  console.log("📥 Signup response:", result);

  // ✅ Check all possible token field names (backend uses snake_case)
  const token = result?.access_token ?? result?.accessToken ?? result?.token;

  if (typeof token === "string") {
    await setAuthToken(token);
    console.log("✅ Token saved successfully");
  } else {
    console.error("❌ No token received from server. Response:", result);
    throw new Error("No authentication token received");
  }

  return result;
}

export async function signOut() {
  await setAuthToken(null);
  console.log("✅ Token cleared");
}
