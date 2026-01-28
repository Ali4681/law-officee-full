import { useQuery } from '@tanstack/react-query';

import { fetchCourtLawyers } from '@/services/courts';
import { getAuthToken } from '@/services/api';
import type { Lawyer } from '@/types/lawyer';

export function useCourtLawyers(courtId?: string) {
  const token = getAuthToken();
  return useQuery<Lawyer[]>({
    queryKey: ['courtLawyers', token, courtId],
    queryFn: () => fetchCourtLawyers(courtId!),
    enabled: Boolean(token && courtId),
    keepPreviousData: true,
  });
}
