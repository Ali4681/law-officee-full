import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAuthToken } from "@/services/api";
import { fetchProfile, updateProfile } from "@/services/user";
import type { UserProfile } from "@/types/user";

const profileQueryKey = (token?: string | null) =>
  token ? ["profile", token] : ["profile"];

export function useProfile() {
  const token = getAuthToken();
  return useQuery<UserProfile>({
    queryKey: profileQueryKey(token),
    queryFn: () => fetchProfile(),
    enabled: Boolean(token),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: (payload: { phone?: string }) => updateProfile(payload),
    onSuccess: () => {
      // Invalidate profile queries to refetch updated data
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "profile",
      });
    },
    onError: (error) => {
      console.error("Failed to update profile:", error);
    },
  });
}
