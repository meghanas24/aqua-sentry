import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Location {
    latitude: number;
    waterBodyName: string;
    description: string;
    longitude: number;
}
export type Timestamp = bigint;
export type AlertId = bigint;
export interface SensorHistoryEntry {
    ph: number;
    tds: number;
    turbidity: number;
    timestamp: Timestamp;
}
export interface DetectionResult {
    totalCount: bigint;
    objects: Array<DetectedObject>;
    timestamp: Timestamp;
}
export interface DeviceStatus {
    batteryLevel: bigint;
    raspberryPiOnline: boolean;
    sensorWorking: boolean;
    lastHeartbeat: Timestamp;
    wifiConnected: boolean;
}
export interface PollutionHistoryEntry {
    score: bigint;
    timestamp: Timestamp;
}
export interface PollutionScore {
    level: PollutionLevel;
    score: bigint;
    timestamp: Timestamp;
    classification: PollutionClassification;
}
export interface SensorReading {
    ph: number;
    tds: number;
    turbidity: number;
    timestamp: Timestamp;
}
export interface DetectedObject {
    x: number;
    y: number;
    height: number;
    width: number;
    confidence: number;
    objectType: string;
}
export interface Alert {
    id: AlertId;
    isAcknowledged: boolean;
    message: string;
    timestamp: Timestamp;
    severity: AlertSeverity;
}
export enum AlertSeverity {
    low = "low",
    high = "high",
    critical = "critical",
    medium = "medium"
}
export enum PollutionClassification {
    HighlyPolluted = "HighlyPolluted",
    Moderate = "Moderate",
    Clean = "Clean"
}
export enum PollutionLevel {
    Low = "Low",
    High = "High",
    Medium = "Medium"
}
export interface backendInterface {
    acknowledgeAlert(id: AlertId): Promise<boolean>;
    addAlert(message: string, severity: AlertSeverity): Promise<AlertId>;
    addDetectionResult(objects: Array<DetectedObject>): Promise<void>;
    getActiveAlerts(): Promise<Array<Alert>>;
    getCurrentSensorReading(): Promise<SensorReading | null>;
    getDeviceStatus(): Promise<DeviceStatus>;
    getLatestDetections(): Promise<DetectionResult | null>;
    getLocation(): Promise<Location>;
    getPollutionHistory(): Promise<Array<PollutionHistoryEntry>>;
    getPollutionScore(): Promise<PollutionScore | null>;
    getSensorHistory(): Promise<Array<SensorHistoryEntry>>;
    updateDeviceStatus(raspberryPiOnline: boolean, sensorWorking: boolean, batteryLevel: bigint, wifiConnected: boolean): Promise<void>;
    updateSensorReading(ph: number, turbidity: number, tds: number): Promise<void>;
}
