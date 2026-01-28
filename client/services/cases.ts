import { apiFetch } from './api';
import type { CaseSummary } from '@/types/case';

const defaultStatuses = [
  'pending',
  'info_requested',
  'fee_proposed',
  'client_rejected',
  'declined',
  'active',
  'in_progress',
  'closed',
];

export async function fetchCases(statuses: string[] = defaultStatuses) {
  const search = new URLSearchParams();
  if (statuses.length) {
    search.append('status', statuses.join(','));
    statuses.forEach((s) => search.append('status', s));
    statuses.forEach((s) => search.append('includeStatus', s));
  }
  const query = search.toString();
  const path = query ? `/cases?${query}` : '/cases';
  const raw = await apiFetch<
    | CaseSummary[]
    | { cases?: CaseSummary[]; data?: CaseSummary[]; result?: CaseSummary[]; items?: CaseSummary[] }
  >(path, { method: 'GET' });

  if (Array.isArray(raw)) return raw;
  if (Array.isArray((raw as any)?.cases)) return (raw as any).cases;
  if (Array.isArray((raw as any)?.data)) return (raw as any).data;
  if (Array.isArray((raw as any)?.result)) return (raw as any).result;
  if (Array.isArray((raw as any)?.items)) return (raw as any).items;
  return [];
}

export async function fetchMyRequests(statuses: string[] = defaultStatuses) {
  const search = new URLSearchParams();
  if (statuses.length) {
    search.append('status', statuses.join(','));
    statuses.forEach((s) => search.append('status', s));
    statuses.forEach((s) => search.append('includeStatus', s));
  }
  const query = search.toString();
  const path = query ? `/cases/requests/my?${query}` : '/cases/requests/my';
  const raw = await apiFetch<
    | CaseSummary[]
    | { cases?: CaseSummary[]; data?: CaseSummary[]; result?: CaseSummary[]; items?: CaseSummary[] }
  >(path, { method: 'GET' });

  if (Array.isArray(raw)) return raw;
  if (Array.isArray((raw as any)?.cases)) return (raw as any).cases;
  if (Array.isArray((raw as any)?.data)) return (raw as any).data;
  if (Array.isArray((raw as any)?.result)) return (raw as any).result;
  if (Array.isArray((raw as any)?.items)) return (raw as any).items;
  return [];
}

export type RequestCaseDto = {
  title: string;
  description: string;
  court: string;
  preferredLawyerId?: string;
};

export async function requestCase(payload: RequestCaseDto) {
  return apiFetch('/cases/request', {
    method: 'POST',
    body: payload,
  });
}

export type AcceptCaseDto = {
  fee?: number;
};

export async function acceptCase(
  caseId: string,
  payload: AcceptCaseDto = {},
) {
  return apiFetch<CaseSummary>(`/cases/${caseId}/accept`, {
    method: 'PATCH',
    body: payload,
  });
}

export type ClientFeeResponseDto = {
  accept: boolean;
  note?: string;
};

export async function respondToFee(
  caseId: string,
  payload: ClientFeeResponseDto,
) {
  return apiFetch<CaseSummary>(`/cases/${caseId}/fee-response`, {
    method: 'PATCH',
    body: payload,
  });
}
