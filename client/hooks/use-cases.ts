import { useQuery } from "@tanstack/react-query";

import { getAuthToken } from "@/services/api";
import { fetchCases } from "@/services/cases";
import type { CaseSummary } from "@/types/case";

export function useCases() {
  const token = getAuthToken();
  return useQuery<CaseSummary[]>({
    queryKey: ["cases", token],
    queryFn: () => fetchCases(),
    enabled: Boolean(token),
  });
}
