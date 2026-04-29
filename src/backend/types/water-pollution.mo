import Common "common";

module {
  public type Timestamp = Common.Timestamp;
  public type AlertId = Common.AlertId;

  // Sensor Data
  public type SensorReading = {
    ph : Float;
    turbidity : Float; // NTU
    tds : Float;       // ppm
    timestamp : Timestamp;
  };

  // Pollution Score
  public type PollutionLevel = { #Low; #Medium; #High };
  public type PollutionClassification = { #Clean; #Moderate; #HighlyPolluted };

  public type PollutionScore = {
    score : Nat;                           // 0–100
    classification : PollutionClassification;
    level : PollutionLevel;
    timestamp : Timestamp;
  };

  public type PollutionHistoryEntry = {
    timestamp : Timestamp;
    score : Nat;
  };

  // AI Object Detection
  public type DetectedObject = {
    objectType : Text;
    confidence : Float;
    x : Float;
    y : Float;
    width : Float;
    height : Float;
  };

  public type DetectionResult = {
    objects : [DetectedObject];
    totalCount : Nat;
    timestamp : Timestamp;
  };

  // Alerts
  public type AlertSeverity = { #low; #medium; #high; #critical };

  public type Alert = {
    id : AlertId;
    message : Text;
    severity : AlertSeverity;
    timestamp : Timestamp;
    isAcknowledged : Bool;
  };

  // Device Status
  public type DeviceStatus = {
    raspberryPiOnline : Bool;
    sensorWorking : Bool;
    batteryLevel : Nat;
    wifiConnected : Bool;
    lastHeartbeat : Timestamp;
  };

  // Location
  public type Location = {
    latitude : Float;
    longitude : Float;
    waterBodyName : Text;
    description : Text;
  };

  // Mutable actor state wrapper (for mixin injection)
  public type MutableState = {
    var nextAlertId : Nat;
    var deviceStatus : DeviceStatus;
    var location : Location;
  };

  // Sensor History Entry (for graphs)
  public type SensorHistoryEntry = {
    timestamp : Timestamp;
    ph : Float;
    turbidity : Float;
    tds : Float;
  };
};
