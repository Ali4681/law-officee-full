import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CourtService } from "@/services/court.service";
import { Court, CreateCourtDto, UpdateCourtDto } from "@/types/court";

export const useCourts = () =>
  useQuery<Court[]>({
    queryKey: ["courts"],
    queryFn: () => CourtService.list(),
  });

export const useCreateCourt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCourtDto) => CourtService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
    },
  });
};

export const useUpdateCourt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateCourtDto;
    }) => CourtService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
    },
  });
};

export const useDeleteCourt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CourtService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
    },
  });
};
