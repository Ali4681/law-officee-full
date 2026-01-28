import type { UserProfile } from "@/types/user";
import { apiFetch, getCurrentUserId } from "./api";

function requireCurrentUserId() {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("Unable to resolve the current user");
  return userId;
}

export async function fetchProfile() {
  const userId = requireCurrentUserId();
  return apiFetch<UserProfile>(`/users/${userId}`, {
    method: "GET",
  });
}

export async function updateProfile(payload: {
  phone?: string;
  firstName?: string;
  lastName?: string;
}) {
  const userId = requireCurrentUserId();
  // Backend expects nested profile object
  return apiFetch<UserProfile>(`/users/${userId}`, {
    method: "PUT",
    body: {
      profile: payload,
    },
  });
}

export async function updateAvatar(file: File | Blob) {
  const userId = requireCurrentUserId();

  const formData = new FormData();
  formData.append("avatar", file);

  return apiFetch<UserProfile>(`/users/${userId}/avatar`, {
    method: "PUT",
    body: formData,
  });
}

export async function deleteAvatar() {
  const userId = requireCurrentUserId();
  return apiFetch<UserProfile>(`/users/${userId}/avatar`, {
    method: "DELETE",
  });
}
