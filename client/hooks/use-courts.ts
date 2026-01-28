import { useQuery } from '@tanstack/react-query';

import { fetchCourts } from '@/services/courts';
import { getAuthToken } from '@/services/api';
import type { Court } from '@/types/court';

type UseCourtsOptions = {
  enabled?: boolean;
};

export function useCourts({ enabled = false }: UseCourtsOptions = {}) {
  const token = getAuthToken();
  return useQuery<Court[]>({
    queryKey: ['courts', token],
    queryFn: fetchCourts,
    enabled,
  });
}
