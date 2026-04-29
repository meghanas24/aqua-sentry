import List "mo:core/List";
import Time "mo:core/Time";
import Types "types/water-pollution";
import WaterLib "lib/water-pollution";
import WaterPollutionApi "mixins/water-pollution-api";

actor {
  let sensorReadings = List.empty<Types.SensorReading>();
  let pollutionHistory = List.empty<Types.PollutionScore>();
  let detections = List.empty<Types.DetectionResult>();
  let alerts = List.empty<Types.Alert>();
  let state : Types.MutableState = {
    var nextAlertId = 0;
    var deviceStatus = {
      raspberryPiOnline = true;
      sensorWorking = true;
      batteryLevel = 78;
      wifiConnected = true;
      lastHeartbeat = 0;
    };
    var location = {
      latitude = 28.6139;
      longitude = 77.2090;
      waterBodyName = "Yamuna River Monitor Station";
      description = "Surface water monitoring station deployed near central monitoring zone";
    };
  };

  // --- Seed data ---
  // 24 hours of hourly sensor readings (oldest → newest)
  // Using compile-time constant offsets: i * 3_600_000_000_000 nanoseconds per hour
  // Realistic pH 6.5-8.5, turbidity 5-100 NTU, TDS 100-900 ppm

  let seedReadings : [(Float, Float, Float)] = [
    (7.2, 18.0, 320.0),
    (7.3, 20.0, 330.0),
    (7.1, 22.0, 310.0),
    (6.9, 25.0, 350.0),
    (6.8, 28.0, 370.0),
    (6.7, 32.0, 390.0),
    (6.6, 35.0, 410.0),
    (6.5, 40.0, 440.0),
    (6.8, 38.0, 420.0),
    (7.0, 35.0, 400.0),
    (7.2, 30.0, 380.0),
    (7.4, 26.0, 350.0),
    (7.6, 22.0, 320.0),
    (7.8, 20.0, 300.0),
    (8.0, 18.0, 280.0),
    (8.1, 22.0, 310.0),
    (8.0, 28.0, 340.0),
    (7.9, 35.0, 390.0),
    (7.7, 45.0, 450.0),
    (7.5, 55.0, 520.0),
    (7.3, 65.0, 580.0),
    (7.1, 75.0, 640.0),
    (6.9, 85.0, 700.0),
    (6.8, 92.0, 760.0),
  ];

  do {
    let now = Time.now();
    let hourNs : Int = 3_600_000_000_000;
    let count : Int = seedReadings.size().toInt();
    var i : Int = 0;
    for ((ph, turb, tds) in seedReadings.values()) {
      let offset : Int = (count - i) * hourNs;
      let ts : Int = now - offset;
      let reading : Types.SensorReading = { ph; turbidity = turb; tds; timestamp = ts };
      sensorReadings.add(reading);
      let score = WaterLib.computePollutionScore(reading);
      pollutionHistory.add({ score with timestamp = ts });
      i += 1;
    };
  };

  // Seed 2 detection results
  do {
    let now = Time.now();
    let hourNs : Int = 3_600_000_000_000;

    // Detection 1 — 2 hours ago: plastic bottle + floating debris
    detections.add({
      objects = [
        { objectType = "PlasticBottle"; confidence = 0.92; x = 120.0; y = 80.0; width = 60.0; height = 80.0 },
        { objectType = "FloatingDebris"; confidence = 0.78; x = 300.0; y = 200.0; width = 90.0; height = 50.0 },
      ];
      totalCount = 2;
      timestamp = now - 2 * hourNs;
    });

    // Detection 2 — most recent: plastic bag + plastic bottle
    detections.add({
      objects = [
        { objectType = "PlasticBag"; confidence = 0.87; x = 200.0; y = 150.0; width = 70.0; height = 55.0 },
        { objectType = "PlasticBottle"; confidence = 0.95; x = 350.0; y = 100.0; width = 55.0; height = 75.0 },
        { objectType = "FloatingDebris"; confidence = 0.71; x = 80.0; y = 260.0; width = 100.0; height = 60.0 },
      ];
      totalCount = 3;
      timestamp = now - hourNs / 4;
    });
  };

  // Seed 3 alerts: critical, high, medium
  do {
    let now = Time.now();
    let hourNs : Int = 3_600_000_000_000;

    alerts.add({
      id = 0;
      message = "High plastic waste detected — 3 objects identified in current frame";
      severity = #critical;
      timestamp = now - hourNs / 4;
      isAcknowledged = false;
    });
    alerts.add({
      id = 1;
      message = "TDS level exceeded safe limit: 760 ppm (threshold: 500 ppm)";
      severity = #high;
      timestamp = now - hourNs;
      isAcknowledged = false;
    });
    alerts.add({
      id = 2;
      message = "Water quality degrading rapidly — turbidity increased 40% in last 6 hours";
      severity = #medium;
      timestamp = now - 3 * hourNs;
      isAcknowledged = false;
    });
    state.nextAlertId := 3;
  };

  // Update device heartbeat with real timestamp
  do {
    state.deviceStatus := { state.deviceStatus with lastHeartbeat = Time.now() };
  };

  include WaterPollutionApi(
    sensorReadings,
    pollutionHistory,
    detections,
    alerts,
    state
  );
};
