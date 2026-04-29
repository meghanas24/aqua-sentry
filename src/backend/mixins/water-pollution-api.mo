import List "mo:core/List";
import Time "mo:core/Time";
import Types "../types/water-pollution";
import WaterLib "../lib/water-pollution";

mixin (
  sensorReadings : List.List<Types.SensorReading>,
  pollutionHistory : List.List<Types.PollutionScore>,
  detections : List.List<Types.DetectionResult>,
  alerts : List.List<Types.Alert>,
  state : Types.MutableState
) {

  // --- Sensor Data ---
  public query func getCurrentSensorReading() : async ?Types.SensorReading {
    WaterLib.getCurrentSensorReading(sensorReadings);
  };

  public func updateSensorReading(ph : Float, turbidity : Float, tds : Float) : async () {
    let now = Time.now();
    let reading : Types.SensorReading = { ph; turbidity; tds; timestamp = now };
    WaterLib.addSensorReading(sensorReadings, reading);
    let score = WaterLib.computePollutionScore(reading);
    pollutionHistory.add(score);
    if (pollutionHistory.size() > 100) { pollutionHistory.truncate(100) };
  };

  // --- Pollution Score ---
  public query func getPollutionScore() : async ?Types.PollutionScore {
    pollutionHistory.last();
  };

  public query func getPollutionHistory() : async [Types.PollutionHistoryEntry] {
    WaterLib.getPollutionHistory(pollutionHistory);
  };

  // --- AI Object Detection ---
  public query func getLatestDetections() : async ?Types.DetectionResult {
    WaterLib.getLatestDetections(detections);
  };

  public func addDetectionResult(objects : [Types.DetectedObject]) : async () {
    let now = Time.now();
    let result : Types.DetectionResult = {
      objects;
      totalCount = objects.size();
      timestamp = now;
    };
    WaterLib.addDetectionResult(detections, result);
  };

  // --- Alerts ---
  public query func getActiveAlerts() : async [Types.Alert] {
    WaterLib.getActiveAlerts(alerts);
  };

  public func acknowledgeAlert(id : Types.AlertId) : async Bool {
    WaterLib.acknowledgeAlert(alerts, id);
  };

  public func addAlert(message : Text, severity : Types.AlertSeverity) : async Types.AlertId {
    let newId = state.nextAlertId;
    state.nextAlertId := WaterLib.addAlert(alerts, state.nextAlertId, message, severity);
    newId;
  };

  // --- Device Status ---
  public query func getDeviceStatus() : async Types.DeviceStatus {
    WaterLib.getDeviceStatus(state.deviceStatus);
  };

  public func updateDeviceStatus(raspberryPiOnline : Bool, sensorWorking : Bool, batteryLevel : Nat, wifiConnected : Bool) : async () {
    let now = Time.now();
    state.deviceStatus := {
      raspberryPiOnline;
      sensorWorking;
      batteryLevel;
      wifiConnected;
      lastHeartbeat = now;
    };
  };

  // --- Location ---
  public query func getLocation() : async Types.Location {
    WaterLib.getLocation(state.location);
  };

  // --- Sensor History ---
  public query func getSensorHistory() : async [Types.SensorHistoryEntry] {
    WaterLib.getSensorHistory(sensorReadings);
  };
};
