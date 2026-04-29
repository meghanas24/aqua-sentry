import { PollutionLevel } from "../types/water";

/** Returns a Tailwind text-color class based on pollution score (0–100) */
export function getPollutionColor(score: number): string {
  if (score <= 30) return "text-emerald-600";
  if (score <= 60) return "text-amber-500";
  return "text-red-600";
}

/** Returns a CSS variable-safe background color token for score zones */
export function getPollutionBgClass(score: number): string {
  if (score <= 30) return "bg-emerald-50 border-emerald-200";
  if (score <= 60) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

/** Returns a human-readable label for a pollution score */
export function getPollutionLabel(score: number): string {
  if (score <= 30) return "Clean";
  if (score <= 60) return "Moderate";
  return "Highly Polluted";
}

/** Returns a label for a PollutionLevel enum value */
export function getPollutionLevelLabel(level: PollutionLevel): string {
  switch (level) {
    case PollutionLevel.Low:
      return "Low";
    case PollutionLevel.Medium:
      return "Medium";
    case PollutionLevel.High:
      return "High";
  }
}

export type SensorStatus = "normal" | "warning" | "critical";

/**
 * Evaluate sensor health for pH, turbidity, TDS.
 * pH: 6.5–8.5 normal, 6.0–9.0 warning, else critical
 * turbidity (NTU): <4 normal, 4–10 warning, >10 critical
 * tds (ppm): <300 normal, 300–600 warning, >600 critical
 */
export function getSensorStatus(
  value: number,
  type: "ph" | "turbidity" | "tds",
): SensorStatus {
  if (type === "ph") {
    if (value >= 6.5 && value <= 8.5) return "normal";
    if (value >= 6.0 && value <= 9.0) return "warning";
    return "critical";
  }
  if (type === "turbidity") {
    if (value < 4) return "normal";
    if (value <= 10) return "warning";
    return "critical";
  }
  if (type === "tds") {
    if (value < 300) return "normal";
    if (value <= 600) return "warning";
    return "critical";
  }
  return "normal";
}

export function getSensorStatusColor(status: SensorStatus): string {
  if (status === "normal") return "text-emerald-600";
  if (status === "warning") return "text-amber-500";
  return "text-red-600";
}

export function getSensorStatusBadgeClass(status: SensorStatus): string {
  if (status === "normal")
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "warning")
    return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

/** Format a bigint nanosecond timestamp to a readable date/time */
export function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  return new Date(ms).toLocaleString();
}

/** Format a bigint nanosecond timestamp to a time-only string */
export function formatTime(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Normalize pollution score from bigint */
export function normalizeScore(score: bigint): number {
  return Math.min(100, Math.max(0, Number(score)));
}

// ─── Prediction & Eco Suggestion Utilities ─────────────────────────────────

export interface PredictionPoint {
  hour: string;
  score: number;
  label: string;
}

/**
 * Generate 6 hourly forecast data points based on current pollution score.
 * Applies a mild sinusoidal drift with random noise to simulate realistic trends.
 */
export function generatePredictionData(
  currentScore: number,
): PredictionPoint[] {
  const now = new Date();
  const points: PredictionPoint[] = [];

  // Drift coefficients — scores naturally regress toward 40 (moderate baseline)
  const baseline = 40;
  const drift = (baseline - currentScore) * 0.08;

  for (let i = 1; i <= 6; i++) {
    const hourOffset = i;
    const label = new Date(
      now.getTime() + hourOffset * 3_600_000,
    ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Apply progressive drift + sinusoidal variation + small noise
    const sinVariation = Math.sin((i / 6) * Math.PI) * 6;
    const noise = (Math.random() - 0.5) * 4;
    const projected = Math.min(
      100,
      Math.max(0, currentScore + drift * i + sinVariation + noise),
    );
    const score = Math.round(projected);

    points.push({ hour: label, score, label: getPollutionLabel(score) });
  }

  return points;
}

/** Eco-action suggestions keyed to pollution level */
const ECO_SUGGESTIONS: Record<PollutionLevel, string[]> = {
  [PollutionLevel.Low]: [
    "Maintain current water flow monitoring schedule — conditions are healthy.",
    "Schedule routine sensor calibration to preserve data accuracy.",
    "Log baseline readings for seasonal comparison reports.",
  ],
  [PollutionLevel.Medium]: [
    "Increase monitoring frequency to every 30 minutes for early anomaly detection.",
    "Notify local environmental teams to prepare a light debris-clearing operation.",
    "Review upstream discharge permits and flag any non-compliant sources.",
  ],
  [PollutionLevel.High]: [
    "Alert authorities immediately — activate emergency water quality response plan.",
    "Deploy physical containment booms to prevent pollutant spread downstream.",
    "Suspend recreational activity advisories and post public safety notices.",
  ],
};

/**
 * Returns 2–3 actionable eco-suggestions based on the current pollution level.
 */
export function generateEcoSuggestions(level: PollutionLevel): string[] {
  return ECO_SUGGESTIONS[level] ?? ECO_SUGGESTIONS[PollutionLevel.Low];
}
