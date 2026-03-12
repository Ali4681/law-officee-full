import { api } from "./api";

export type CreateHearingDto = {
  caseId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time?: string; // Time string (HH:MM or HH:MM AM/PM)
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
