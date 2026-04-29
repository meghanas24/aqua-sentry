// Re-export backend types with UI-friendly aliases
export type {
  SensorReading,
  PollutionScore,
  PollutionHistoryEntry,
  SensorHistoryEntry,
  DetectionResult,
  DetectedObject,
  Alert,
  DeviceStatus,
  Location,
} from "../backend";

export {
  AlertSeverity,
  PollutionClassification,
  PollutionLevel,
} from "../backend";

export type Timestamp = bigint;
export type AlertId = bigint;
