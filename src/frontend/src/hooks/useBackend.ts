import { useActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";

/** Returns the initialized backend actor and isFetching status */
export function useBackend() {
  return useActor(createActor);
}
