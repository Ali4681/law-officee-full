import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserService } from "@/services/user.service";
import { User } from "@/types/auth";

export const usePendingLawyers = () =>
  useQuery<User[]>({
    queryKey: ["users", "lawyers", "pending"],
    queryFn: () => UserService.listPendingLawyers(),
  });

export const useApproveLawyer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => UserService.approveLawyer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "lawyers", "pending"] });
    },
  });
};

export const useRejectLawyer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => UserService.rejectLawyer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "lawyers", "pending"] });
    },
  });
};
