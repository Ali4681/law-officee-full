import { api } from "./api";
import { User } from "@/types/auth";

export const UserService = {
  async listPendingLawyers(): Promise<User[]> {
    const res = await api.get("/users/lawyers/pending");
    return res.data;
  },

  async approveLawyer(id: string): Promise<User> {
    const res = await api.put(`/users/lawyers/${id}/approve`);
    return res.data;
  },

  async rejectLawyer(id: string): Promise<User> {
    const res = await api.put(`/users/lawyers/${id}/reject`);
    return res.data;
  },
};
