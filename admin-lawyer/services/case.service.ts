import {
  CaseDetail,
  CaseResponseDto,
  CaseStatus,
  CaseSummary,
} from "@/types/case";
import { api } from "./api";

export const CaseService = {
  async listMyCases(): Promise<CaseSummary[]> {
    try {
      const res = await api.get("/cases/my");
      return res.data;
    } catch (err) {
      // Fallback for APIs that expose all cases for current user at /cases
      const res = await api.get("/cases");
      return res.data;
    }
  },

  async listIncomingCases(): Promise<CaseSummary[]> {
    const res = await api.get("/cases/requests/pending");
    return res.data;
  },

  async getCase(id: string): Promise<CaseDetail> {
    try {
      const res = await api.get(`/cases/${id}`);
      return res.data;
    } catch (err) {
      // Fallback: fetch all cases and find by id if direct endpoint fails
      const res = await api.get("/cases");
      const found = (res.data as CaseDetail[]).find(
        (c) => c._id === id || (c as any).id === id
      );
      if (!found) {
        throw err;
      }
      return found;
    }
  },

  async respondToCase(id: string, dto: CaseResponseDto): Promise<any> {
    const path =
      dto.action === "accept" ? `/cases/${id}/accept` : `/cases/${id}/decline`;
    const payload =
      dto.action === "accept" ? { fee: dto.fee } : { reason: dto.reason };
    const res = await api.patch(path, payload);
    return res.data;
  },

  async updateStatus(id: string, status: CaseStatus): Promise<CaseDetail> {
    const res = await api.patch(`/cases/${id}/status`, { status });
    return res.data;
  },
};
