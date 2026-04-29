import { useQuery } from "@tanstack/react-query";
import type { DetectionResult } from "../types/water";
import { useBackend } from "./useBackend";

export function useDetections() {
  const { actor, isFetching } = useBackend();
  return useQuery<DetectionResult | null>({
    queryKey: ["latestDetections"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getLatestDetections();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}
