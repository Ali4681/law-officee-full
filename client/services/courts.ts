import type { Court } from "@/types/court";
import type { Lawyer } from "@/types/lawyer";
import { apiFetch } from "./api";

export async function fetchCourts() {
  return apiFetch<Court[] | { data?: Court[]; courts?: Court[] }>("/courts", {
    method: "GET",
  }).then((res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.courts)) return res.courts;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  });
}

export async function fetchCourtLawyers(courtId: string): Promise<Lawyer[]> {
  const response = await apiFetch<
    | Lawyer[]
    | {
        lawyers?: Lawyer[];
        data?: Lawyer[];
        result?: Lawyer[];
        items?: Lawyer[];
      }
  >(`/courts/${courtId}/lawyers`, { method: "GET" });

  if (Array.isArray(response)) return response;

  const normalized = response as {
    lawyers?: Lawyer[];
    data?: Lawyer[];
    result?: Lawyer[];
    items?: Lawyer[];
  };

  const fallbackKeys: (keyof typeof normalized)[] = [
    "lawyers",
    "data",
    "result",
    "items",
  ];

  for (const key of fallbackKeys) {
    const value = normalized[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}
