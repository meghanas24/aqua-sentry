import Float "mo:core/Float";
import Int "mo:core/Int";
import List "mo:core/List";
import Time "mo:core/Time";
import Types "../types/water-pollution";

module {

  // --- Helpers ---

  let MAX_HISTORY : Nat = 100;

  func trimList<T>(list : List.List<T>) {
    let s = list.size();
    if (s > MAX_HISTORY) {
      list.truncate(MAX_HISTORY);
    };
  };

  // --- Sensor ---

  public func getCurrentSensorReading(readings : List.List<Types.SensorReading>) : ?Types.SensorReading {
    readings.last();
  };

  public func addSensorReading(readings : List.List<Types.SensorReading>, reading : Types.SensorReading) {
    readings.add(reading);
    trimList(readings);
  };

  public func getSensorHistory(readings : List.List<Types.SensorReading>) : [Types.SensorHistoryEntry] {
    readings.map<Types.SensorReading, Types.SensorHistoryEntry>(
      func(r) = { timestamp = r.timestamp; ph = r.ph; turbidity = r.turbidity; tds = r.tds }
    ).toArray();
  };

  // --- Pollution Score ---

  // Derives a 0-100 pollution score from sensor values.
  // pH ideal range: 6.5-8.5. Turbidity ideal < 25 NTU. TDS ideal < 500 ppm.
  public func computePollutionScore(reading : Types.SensorReading) : Types.PollutionScore {
    let now = Time.now();

    // pH score: penalty for deviation from neutral 7.0
    let phDev = if (reading.ph < 7.0) { 7.0 - reading.ph } else { reading.ph - 7.0 };
    let phScore : Float = if (phDev <= 1.5) { phDev / 1.5 * 30.0 } else { 30.0 };

    // Turbidity score: 0 NTU = 0 pts, 100 NTU = 35 pts
    let turbScore : Float = if (reading.turbidity >= 100.0) { 35.0 } else { reading.turbidity / 100.0 * 35.0 };

    // TDS score: 0 ppm = 0 pts, 1000 ppm = 35 pts
    let tdsScore : Float = if (reading.tds >= 1000.0) { 35.0 } else { reading.tds / 1000.0 * 35.0 };

    let totalFloat = phScore + turbScore + tdsScore;
    let totalClamped : Float = if (totalFloat > 100.0) { 100.0 } else { totalFloat };
    let total : Nat = Int.abs((totalClamped + 0.5).toInt());

    let classification : Types.PollutionClassification = if (total <= 30) { #Clean } else if (total <= 60) { #Moderate } else { #HighlyPolluted };
    let level : Types.PollutionLevel = if (total <= 30) { #Low } else if (total <= 60) { #Medium } else { #High };

    { score = total; classification; level; timestamp = now };
  };

  public func getPollutionHistory(history : List.List<Types.PollutionScore>) : [Types.PollutionHistoryEntry] {
    history.map<Types.PollutionScore, Types.PollutionHistoryEntry>(
      func(e) = { timestamp = e.timestamp; score = e.score }
    ).toArray();
  };

  // --- AI Detection ---

  public func getLatestDetections(detections : List.List<Types.DetectionResult>) : ?Types.DetectionResult {
    detections.last();
  };

  public func addDetectionResult(detections : List.List<Types.DetectionResult>, result : Types.DetectionResult) {
    detections.add(result);
    trimList(detections);
  };

  // --- Alerts ---

  public func getActiveAlerts(alerts : List.List<Types.Alert>) : [Types.Alert] {
    alerts.filter(func(a) = not a.isAcknowledged).toArray();
  };

  public func acknowledgeAlert(alerts : List.List<Types.Alert>, id : Types.AlertId) : Bool {
    var found = false;
    alerts.mapInPlace(
      func(a) {
        if (a.id == id and not a.isAcknowledged) {
          found := true;
          { a with isAcknowledged = true };
        } else { a };
      }
    );
    found;
  };

  public func addAlert(alerts : List.List<Types.Alert>, nextId : Nat, message : Text, severity : Types.AlertSeverity) : Nat {
    let now = Time.now();
    alerts.add({
      id = nextId;
      message;
      severity;
      timestamp = now;
      isAcknowledged = false;
    });
    nextId + 1;
  };

  // --- Device Status ---

  public func getDeviceStatus(status : Types.DeviceStatus) : Types.DeviceStatus {
    status;
  };

  // --- Location ---

  public func getLocation(location : Types.Location) : Types.Location {
    location;
  };
};
