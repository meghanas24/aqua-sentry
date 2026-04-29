import { useQuery } from "@tanstack/react-query";
import type { DeviceStatus, Location } from "../types/water";
import { useBackend } from "./useBackend";

export function useDeviceStatus() {
  const { actor, isFetching } = useBackend();
  return useQuery<DeviceStatus>({
    queryKey: ["deviceStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getDeviceStatus();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useLocation() {
  const { actor, isFetching } = useBackend();
  return useQuery<Location>({
    queryKey: ["location"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getLocation();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}
