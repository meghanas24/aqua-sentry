import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Battery,
  BatteryLow,
  Bell,
  BellOff,
  CheckCircle,
  Cpu,
  MapPin,
  Navigation,
  Signal,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useAcknowledgeAlert, useAlerts } from "../hooks/useAlerts";
import { useDeviceStatus, useLocation } from "../hooks/useDeviceStatus";
import { AlertSeverity } from "../types/water";
import type { Alert, DeviceStatus, Location } from "../types/water";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  const date = new Date(ms);
  const now = Date.now();
  const diffMs = now - ms;
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface SeverityConfig {
  borderColor: string;
  bgColor: string;
  headerBg: string;
  iconBg: string;
  badge: "destructive" | "secondary" | "outline";
  badgeCustomClass: string;
  label: string;
  icon: typeof AlertTriangle;
  iconClass: string;
  dotColor: string;
}

function severityConfig(severity: AlertSeverity): SeverityConfig {
  switch (severity) {
    case AlertSeverity.critical:
      return {
        borderColor: "border-l-red-500",
        bgColor: "bg-red-500/8",
        headerBg: "bg-red-500/12",
        iconBg: "bg-red-500/15",
        badge: "destructive",
        badgeCustomClass: "bg-red-500 text-white border-red-600",
        label: "Critical",
        icon: AlertTriangle,
        iconClass: "text-red-500",
        dotColor: "bg-red-500",
      };
    case AlertSeverity.high:
      return {
        borderColor: "border-l-orange-500",
        bgColor: "bg-orange-500/8",
        headerBg: "bg-orange-500/12",
        iconBg: "bg-orange-500/15",
        badge: "destructive",
        badgeCustomClass: "bg-orange-500 text-white border-orange-600",
        label: "High",
        icon: AlertTriangle,
        iconClass: "text-orange-500",
        dotColor: "bg-orange-500",
      };
    case AlertSeverity.medium:
      return {
        borderColor: "border-l-yellow-500",
        bgColor: "bg-yellow-500/8",
        headerBg: "bg-yellow-500/12",
        iconBg: "bg-yellow-500/15",
        badge: "secondary",
        badgeCustomClass: "bg-yellow-400 text-yellow-900 border-yellow-500",
        label: "Medium",
        icon: Bell,
        iconClass: "text-yellow-600",
        dotColor: "bg-yellow-500",
      };
    default:
      return {
        borderColor: "border-l-muted-foreground/30",
        bgColor: "bg-muted/20",
        headerBg: "bg-muted/30",
        iconBg: "bg-muted/40",
        badge: "outline",
        badgeCustomClass: "text-muted-foreground border-border",
        label: "Low",
        icon: Bell,
        iconClass: "text-muted-foreground",
        dotColor: "bg-muted-foreground/50",
      };
  }
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  index,
  onAcknowledge,
}: {
  alert: Alert;
  index: number;
  onAcknowledge: (id: bigint) => void;
}) {
  const cfg = severityConfig(alert.severity);
  const Icon = cfg.icon;
  const isUnack = !alert.isAcknowledged;

  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{
        opacity: 0,
        x: 16,
        height: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
      }}
      transition={{ duration: 0.28, delay: index * 0.05 }}
      data-ocid={`alert.item.${index + 1}`}
      className={[
        "relative border-l-4 rounded-r-xl border border-border/50 overflow-hidden",
        cfg.borderColor,
        isUnack ? "animate-alert-pulse" : "opacity-60",
      ].join(" ")}
    >
      {/* Subtle severity tinted header strip */}
      <div
        className={`${cfg.headerBg} px-4 pt-3.5 pb-2 flex items-start gap-3`}
      >
        {/* Icon bubble */}
        <div
          className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg ${cfg.iconBg} flex items-center justify-center`}
        >
          <Icon className={`w-3.5 h-3.5 ${cfg.iconClass}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold leading-snug ${isUnack ? "text-foreground" : "text-muted-foreground"}`}
          >
            {alert.message}
          </p>
        </div>

        {/* Unread live dot */}
        {isUnack && (
          <span className="relative flex shrink-0 mt-1.5 w-2.5 h-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${cfg.dotColor} opacity-70 animate-ping`}
            />
            <span
              className={`relative inline-flex rounded-full w-2.5 h-2.5 ${cfg.dotColor}`}
            />
          </span>
        )}
      </div>

      {/* Footer row */}
      <div
        className={`${cfg.bgColor} px-4 pb-3 flex items-center gap-2 flex-wrap`}
      >
        <span
          className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeCustomClass}`}
        >
          {cfg.label}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          {formatTimestamp(alert.timestamp)}
        </span>
        {isUnack && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-6 px-2.5 text-xs font-medium rounded-lg border border-border/60 hover:bg-background transition-smooth"
            data-ocid={`alert.dismiss_button.${index + 1}`}
            onClick={() => onAcknowledge(alert.id)}
          >
            Dismiss
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Map Panel ────────────────────────────────────────────────────────────────

function MapPanel({
  location,
  isLoading,
}: {
  location: Location | undefined;
  isLoading: boolean;
}) {
  const hotspots = [
    {
      top: "38%",
      left: "55%",
      size: 20,
      color: "bg-red-500/80",
      pingColor: "bg-red-400",
      label: "High",
    },
    {
      top: "55%",
      left: "35%",
      size: 16,
      color: "bg-yellow-400/80",
      pingColor: "bg-yellow-300",
      label: "Medium",
    },
    {
      top: "30%",
      left: "25%",
      size: 12,
      color: "bg-green-400/80",
      pingColor: "bg-green-300",
      label: "Low",
    },
    {
      top: "62%",
      left: "65%",
      size: 13,
      color: "bg-yellow-400/80",
      pingColor: "bg-yellow-300",
      label: "Medium",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Map container */}
      <div className="relative w-full h-60 rounded-xl overflow-hidden border border-border/60 shadow-elevated">
        {/* Deep water gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 48% 52%, oklch(0.60 0.16 220 / 0.55) 0%, oklch(0.45 0.14 240 / 0.40) 50%, oklch(0.35 0.10 255 / 0.25) 100%)",
          }}
        />
        {/* Surface shimmer */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.80 0.12 210 / 0.3) 0%, transparent 50%, oklch(0.70 0.18 230 / 0.2) 100%)",
          }}
        />

        {/* Central ripple rings — animate-status-live class from design system */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border border-primary/25"
              style={{
                width: `${i * 22}%`,
                height: `${i * 17}%`,
                animation: "water-ripple 4.5s ease-out infinite",
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>

        {/* Hotspot markers */}
        {hotspots.map((h) => (
          <div
            key={`${h.label}-${h.top}`}
            className={`absolute rounded-full ${h.color} border-2 border-white/40 shadow-md cursor-pointer`}
            style={{
              top: h.top,
              left: h.left,
              width: h.size,
              height: h.size,
              transform: "translate(-50%, -50%)",
            }}
            title={`Pollution Hotspot: ${h.label}`}
          >
            <span
              className={`absolute inset-0 rounded-full ${h.pingColor} animate-ping opacity-50`}
            />
          </div>
        ))}

        {/* Device pin */}
        {location && (
          <div
            className="absolute"
            style={{
              top: "48%",
              left: "48%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="w-8 h-8 rounded-full bg-primary border-2 border-white shadow-elevated flex items-center justify-center">
              <Navigation className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            {/* Pulse ring around device pin */}
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          </div>
        )}

        {/* Top-left label */}
        <div className="absolute top-3 left-3 bg-card/85 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-border/50 shadow-subtle">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-status-live" />
            <span className="text-xs font-semibold text-foreground">
              Live Pollution Map
            </span>
          </div>
        </div>

        {/* Bottom-right legend */}
        <div className="absolute bottom-3 right-3 bg-card/85 backdrop-blur-sm rounded-lg px-2.5 py-2 border border-border/50 shadow-subtle space-y-1">
          {[
            { color: "bg-red-500", label: "High" },
            { color: "bg-yellow-400", label: "Medium" },
            { color: "bg-green-400", label: "Low" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${l.color}`} />
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* GPS Info */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      ) : location ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border/60 rounded-xl p-3.5 space-y-1 shadow-subtle">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Latitude
            </p>
            <p
              className="font-mono text-sm font-bold text-foreground"
              data-ocid="location.latitude"
            >
              {location.latitude.toFixed(6)}°
            </p>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-3.5 space-y-1 shadow-subtle">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Longitude
            </p>
            <p
              className="font-mono text-sm font-bold text-foreground"
              data-ocid="location.longitude"
            >
              {location.longitude.toFixed(6)}°
            </p>
          </div>
          <div className="col-span-2 bg-primary/5 border border-primary/20 rounded-xl p-3.5 shadow-subtle">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Water Body
              </p>
            </div>
            <p
              className="font-semibold text-foreground"
              data-ocid="location.water_body_name"
            >
              {location.waterBodyName}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {location.description}
            </p>
          </div>
        </div>
      ) : (
        <div
          className="bg-muted/30 rounded-xl p-5 text-center border border-border/40"
          data-ocid="location.empty_state"
        >
          <MapPin className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-muted-foreground">
            Location data unavailable
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Device Status Panel ──────────────────────────────────────────────────────

function DeviceStatusPanel({
  status,
  isLoading,
}: {
  status: DeviceStatus | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!status) {
    return (
      <div
        className="bg-muted/30 rounded-xl p-6 text-center border border-border/40"
        data-ocid="device.empty_state"
      >
        <Cpu className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Device data unavailable</p>
      </div>
    );
  }

  const battery = Number(status.batteryLevel);
  const batteryBarColor =
    battery > 60
      ? "bg-green-500"
      : battery > 30
        ? "bg-yellow-500"
        : "bg-red-500";
  const batteryTextColor =
    battery > 60
      ? "text-green-600 dark:text-green-400"
      : battery > 30
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-destructive";

  interface DeviceCard {
    id: string;
    label: string;
    isOk: boolean;
    content: React.ReactNode;
  }

  const cards: DeviceCard[] = [
    {
      id: "device.raspberry_pi_card",
      label: "Raspberry Pi",
      isOk: status.raspberryPiOnline,
      content: (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${status.raspberryPiOnline ? "bg-green-500/15" : "bg-red-500/15"}`}
            >
              <Cpu
                className={`w-4 h-4 ${status.raspberryPiOnline ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Raspberry Pi
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex w-3 h-3 shrink-0">
              {status.raspberryPiOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full w-3 h-3 ${status.raspberryPiOnline ? "bg-green-500" : "bg-red-500"}`}
              />
            </span>
            <span
              className={`text-sm font-bold ${status.raspberryPiOnline ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
            >
              {status.raspberryPiOnline ? "Online" : "Offline"}
            </span>
          </div>
        </>
      ),
    },
    {
      id: "device.sensor_card",
      label: "Sensor",
      isOk: status.sensorWorking,
      content: (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${status.sensorWorking ? "bg-green-500/15" : "bg-red-500/15"}`}
            >
              {status.sensorWorking ? (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Sensor
            </span>
          </div>
          <div className="flex items-center gap-2">
            {status.sensorWorking ? (
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive shrink-0" />
            )}
            <span
              className={`text-sm font-bold ${status.sensorWorking ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
            >
              {status.sensorWorking ? "Working" : "Error"}
            </span>
          </div>
        </>
      ),
    },
    {
      id: "device.battery_card",
      label: "Battery",
      isOk: battery > 20,
      content: (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${battery > 20 ? "bg-green-500/15" : "bg-red-500/15"}`}
            >
              {battery > 20 ? (
                <Battery className={`w-4 h-4 ${batteryTextColor}`} />
              ) : (
                <BatteryLow className="w-4 h-4 text-destructive" />
              )}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Battery
            </span>
          </div>
          <p className={`text-sm font-bold mb-1.5 ${batteryTextColor}`}>
            {battery}%
          </p>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-smooth ${batteryBarColor}`}
              style={{ width: `${battery}%` }}
            />
          </div>
        </>
      ),
    },
    {
      id: "device.wifi_card",
      label: "Connectivity",
      isOk: status.wifiConnected,
      content: (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${status.wifiConnected ? "bg-green-500/15" : "bg-red-500/15"}`}
            >
              {status.wifiConnected ? (
                <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-destructive" />
              )}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Connectivity
            </span>
          </div>
          <div className="flex items-center gap-2">
            {status.wifiConnected ? (
              <Wifi className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <Signal className="w-4 h-4 text-destructive shrink-0" />
            )}
            <span
              className={`text-sm font-bold ${status.wifiConnected ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
            >
              {status.wifiConnected ? "WiFi/IoT" : "No Signal"}
            </span>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            data-ocid={card.id}
            className={[
              "rounded-xl p-3.5 border shadow-subtle transition-smooth",
              card.isOk
                ? "bg-green-500/5 border-green-500/20"
                : "bg-red-500/5 border-red-500/20",
            ].join(" ")}
          >
            {card.content}
          </motion.div>
        ))}
      </div>

      {/* Last heartbeat row */}
      <div className="bg-muted/30 border border-border/40 rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-status-live" />
          <span className="text-xs text-muted-foreground font-medium">
            Last Heartbeat
          </span>
        </div>
        <span
          className="text-xs font-mono font-semibold text-foreground"
          data-ocid="device.last_heartbeat"
        >
          {formatTimestamp(status.lastHeartbeat)}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const { data: deviceStatus, isLoading: deviceLoading } = useDeviceStatus();
  const { data: location, isLoading: locationLoading } = useLocation();
  const acknowledgeAlert = useAcknowledgeAlert();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unacknowledgedCount = alerts.filter((a) => !a.isAcknowledged).length;
  const filteredAlerts =
    filter === "unread" ? alerts.filter((a) => !a.isAcknowledged) : alerts;

  return (
    <div
      className="container mx-auto px-4 py-8 max-w-6xl"
      data-ocid="alerts.page"
    >
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="w-11 h-11 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shadow-subtle">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Alerts, Map & Device Status
          </h1>
          <p className="text-sm text-muted-foreground">
            Live notifications, pollution heatmap &amp; sensor device health
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left column: Alert Feed (2 cols) ─────────────────────── */}
        <div className="lg:col-span-2 space-y-0">
          <div className="bg-card border border-border rounded-xl shadow-md overflow-hidden h-full flex flex-col">
            {/* Section header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-muted/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="font-semibold text-sm text-foreground">
                  Alert Feed
                </span>
                {unacknowledgedCount > 0 && (
                  <span
                    data-ocid="alerts.unread_badge"
                    className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold tabular-nums"
                  >
                    {unacknowledgedCount}
                  </span>
                )}
              </div>

              {/* Pill-style filter tabs */}
              <div
                className="flex gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50"
                data-ocid="alerts.filter_tabs"
              >
                {(["all", "unread"] as const).map((f) => (
                  <button
                    type="button"
                    key={f}
                    data-ocid={`alerts.filter.${f}`}
                    onClick={() => setFilter(f)}
                    className={[
                      "text-xs px-3 py-1 rounded-md font-medium capitalize transition-smooth",
                      filter === f
                        ? "bg-primary text-primary-foreground shadow-subtle"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                    ].join(" ")}
                  >
                    {f}
                    {f === "unread" && unacknowledgedCount > 0 && (
                      <span className="ml-1 text-xs opacity-80">
                        ({unacknowledgedCount})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert list */}
            <div
              className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[560px]"
              data-ocid="alerts.list"
            >
              {alertsLoading ? (
                <div className="space-y-2 pt-1">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[72px] rounded-xl" />
                  ))}
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 text-center"
                  data-ocid="alerts.empty_state"
                >
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                    <BellOff className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">
                    No alerts
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {filter === "unread"
                      ? "All alerts acknowledged"
                      : "System operating normally"}
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredAlerts.map((alert, i) => (
                    <AlertCard
                      key={String(alert.id)}
                      alert={alert}
                      index={i}
                      onAcknowledge={(id) => acknowledgeAlert.mutate(id)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* ── Right columns: Map + Device Status (3 cols) ─────────── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Map Panel */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.1 }}
            className="bg-card border border-border rounded-xl shadow-md overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/60 bg-muted/30">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="font-semibold text-sm text-foreground">
                Location & Pollution Map
              </span>
            </div>
            <div className="p-4" data-ocid="location.panel">
              <MapPanel location={location} isLoading={locationLoading} />
            </div>
          </motion.div>

          {/* Device Status Panel */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.2 }}
            className="bg-card border border-border rounded-xl shadow-md overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/60 bg-muted/30">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-semibold text-sm text-foreground">
                Device Status
              </span>
              {deviceStatus && (
                <Badge
                  variant={
                    deviceStatus.raspberryPiOnline ? "default" : "destructive"
                  }
                  className="ml-auto text-xs"
                  data-ocid="device.online_badge"
                >
                  {deviceStatus.raspberryPiOnline ? "Online" : "Offline"}
                </Badge>
              )}
            </div>
            <div className="p-4" data-ocid="device.panel">
              <DeviceStatusPanel
                status={deviceStatus}
                isLoading={deviceLoading}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
