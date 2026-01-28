import { api } from "./api";

export type CreateHearingDto = {
  caseId: string;
  date: string;
  clientId?: string;
  location?: string;
  notes?: string;
  result?: string;
};

export const HearingService = {
  async create(payload: CreateHearingDto): Promise<any> {
    const res = await api.post("/hearings", payload);
    return res.data;
  },
};
