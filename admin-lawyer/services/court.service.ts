import { Court, CreateCourtDto, UpdateCourtDto } from "@/types/court";
import { api } from "./api";

export const CourtService = {
  async list(): Promise<Court[]> {
    const res = await api.get("/courts");
    return res.data;
  },

  async getById(id: string): Promise<Court> {
    const res = await api.get(`/courts/${id}`);
    return res.data;
  },

  async create(dto: CreateCourtDto): Promise<Court> {
    const res = await api.post("/courts", dto);
    return res.data;
  },

  async update(id: string, dto: UpdateCourtDto): Promise<Court> {
    const res = await api.patch(`/courts/${id}`, dto);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/courts/${id}`);
  },
};
