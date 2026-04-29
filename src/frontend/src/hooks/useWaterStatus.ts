import { useQuery } from "@tanstack/react-query";
import type { PollutionScore, SensorReading } from "../types/water";
import { useBackend } from "./useBackend";

export function useCurrentSensorReading() {
  const { actor, isFetching } = useBackend();
  return useQuery<SensorReading | null>({
    queryKey: ["currentSensorReading"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCurrentSensorReading();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function usePollutionScore() {
  const { actor, isFetching } = useBackend();
  return useQuery<PollutionScore | null>({
    queryKey: ["pollutionScore"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPollutionScore();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useWaterStatus() {
  const sensorQuery = useCurrentSensorReading();
  const scoreQuery = usePollutionScore();
  return {
    sensor: sensorQuery.data ?? null,
    score: scoreQuery.data ?? null,
    isLoading: sensorQuery.isLoading || scoreQuery.isLoading,
    isError: sensorQuery.isError || scoreQuery.isError,
  };
}
