import { useQuery } from "@tanstack/react-query";
import type { PollutionHistoryEntry, SensorHistoryEntry } from "../types/water";
import { useBackend } from "./useBackend";

export function useSensorHistory() {
  const { actor, isFetching } = useBackend();
  return useQuery<SensorHistoryEntry[]>({
    queryKey: ["sensorHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSensorHistory();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function usePollutionHistory() {
  const { actor, isFetching } = useBackend();
  return useQuery<PollutionHistoryEntry[]>({
    queryKey: ["pollutionHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPollutionHistory();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}
