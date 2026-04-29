import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Alert } from "../types/water";
import { useBackend } from "./useBackend";

export function useAlerts() {
  const { actor, isFetching } = useBackend();
  return useQuery<Alert[]>({
    queryKey: ["activeAlerts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveAlerts();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useAcknowledgeAlert() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.acknowledgeAlert(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeAlerts"] });
    },
  });
}
