import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CaseService } from "@/services/case.service";
import { CaseDetail, CaseResponseDto, CaseStatus, CaseSummary } from "@/types/case";

export const useMyCases = () =>
  useQuery<CaseSummary[]>({
    queryKey: ["cases", "my"],
    queryFn: () => CaseService.listMyCases(),
  });

export const useIncomingCases = () =>
  useQuery<CaseSummary[]>({
    queryKey: ["cases", "incoming"],
    queryFn: () => CaseService.listIncomingCases(),
  });

export const useCase = (id?: string) =>
  useQuery<CaseDetail>({
    queryKey: ["cases", id],
    queryFn: () => CaseService.getCase(id as string),
    enabled: !!id,
  });

export const useRespondToCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: CaseResponseDto;
    }) => CaseService.respondToCase(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases", "incoming"] });
      queryClient.invalidateQueries({ queryKey: ["cases", "my"] });
    },
  });
};

export const useUpdateCaseStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CaseStatus }) =>
      CaseService.updateStatus(id, status),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["cases", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["cases", "my"] });
      queryClient.invalidateQueries({ queryKey: ["cases", "incoming"] });
    },
  });
};
