import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Camera,
  Clock,
  Eye,
  Package,
  Trash2,
  Wind,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDetections } from "../hooks/useDetections";
import type { DetectedObject, DetectionResult } from "../types/water";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  timestamp: bigint;
  objectCount: number;
  id: number;
}

// ─── Confidence-based bounding box coloring ───────────────────────────────────

function getConfidenceColor(confidence: number): {
  border: string;
  bg: string;
  glow: string;
} {
  if (confidence >= 0.8)
    return {
      border: "#ef4444",
      bg: "rgba(239,68,68,0.14)",
      glow: "rgba(239,68,68,0.35)",
    };
  if (confidence >= 0.6)
    return {
      border: "#facc15",
      bg: "rgba(250,204,21,0.12)",
      glow: "rgba(250,204,21,0.30)",
    };
  return {
    border: "#22d3ee",
    bg: "rgba(34,211,238,0.10)",
    glow: "rgba(34,211,238,0.28)",
  };
}

// ─── Object-type icon mapping ─────────────────────────────────────────────────
const OBJECT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  bottle: Package,
  bag: Wind,
  debris: Trash2,
};

function getObjectIcon(type: string) {
  const key = type.toLowerCase();
  const match = Object.entries(OBJECT_ICONS).find(([k]) => key.includes(k));
  return match ? match[1] : Trash2;
}

// ─── Object card accent colors (type-based) ───────────────────────────────────
const OBJECT_ACCENTS: Record<string, string> = {
  bottle: "#22d3ee",
  bag: "#a78bfa",
  debris: "#f97316",
};

function getObjectAccent(type: string): string {
  const key = type.toLowerCase();
  const match = Object.entries(OBJECT_ACCENTS).find(([k]) => key.includes(k));
  return match ? match[1] : "#a78bfa";
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  if (ms === 0) return "—";
  return new Date(ms).toLocaleTimeString();
}

function avgConfidence(objects: DetectedObject[]): number {
  if (!objects.length) return 0;
  return objects.reduce((sum, o) => sum + o.confidence, 0) / objects.length;
}

const FRAME_W = 640;
const FRAME_H = 360;

// ─── Bounding Box Overlay ─────────────────────────────────────────────────────

function BoundingBox({ obj }: { obj: DetectedObject }) {
  const color = getConfidenceColor(obj.confidence);
  const pct = Math.round(obj.confidence * 100);
  const left = `${(obj.x / FRAME_W) * 100}%`;
  const top = `${(obj.y / FRAME_H) * 100}%`;
  const width = `${(obj.width / FRAME_W) * 100}%`;
  const height = `${(obj.height / FRAME_H) * 100}%`;

  // Clamp label to stay inside frame right edge
  const labelIsNearRight = obj.x / FRAME_W > 0.65;

  return (
    <div
      className="absolute group"
      style={{
        left,
        top,
        width,
        height,
        border: `1.5px solid ${color.border}`,
        background: color.bg,
        borderRadius: 4,
        boxShadow: `0 0 8px ${color.glow}, inset 0 0 4px ${color.glow}`,
      }}
    >
      {/* Corner accents */}
      <div
        className="absolute -top-px -left-px w-2 h-2 border-t border-l"
        style={{ borderColor: color.border }}
      />
      <div
        className="absolute -top-px -right-px w-2 h-2 border-t border-r"
        style={{ borderColor: color.border }}
      />
      <div
        className="absolute -bottom-px -left-px w-2 h-2 border-b border-l"
        style={{ borderColor: color.border }}
      />
      <div
        className="absolute -bottom-px -right-px w-2 h-2 border-b border-r"
        style={{ borderColor: color.border }}
      />

      {/* Label — flip to inside when near right edge */}
      <div
        className="absolute -top-5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-black"
        style={{
          background: color.border,
          left: labelIsNearRight ? "auto" : 0,
          right: labelIsNearRight ? 0 : "auto",
          whiteSpace: "nowrap",
          maxWidth: "120px",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <span className="truncate">{obj.objectType}</span>
        <span className="shrink-0 opacity-90">{pct}%</span>
      </div>
    </div>
  );
}

// ─── Animated Scan Line ───────────────────────────────────────────────────────

function ScanLine() {
  return (
    <div
      className="absolute inset-x-0 h-px pointer-events-none z-10"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.6) 30%, rgba(34,211,238,0.9) 50%, rgba(34,211,238,0.6) 70%, transparent 100%)",
        animation: "scanline 3s linear infinite",
      }}
    />
  );
}

// ─── Camera Feed Panel ────────────────────────────────────────────────────────

function CameraFeed({
  objects,
  isLoading,
}: { objects: DetectedObject[]; isLoading: boolean }) {
  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden shadow-md"
      data-ocid="detection.camera_feed"
    >
      {/* Feed Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            Live Camera Feed
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            · CAM-01
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            {objects.length} object{objects.length !== 1 ? "s" : ""} detected
          </span>
          <div
            className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-full"
            data-ocid="detection.live_badge"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-500 tracking-wider">
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* 16:9 feed area */}
      <div
        className="relative w-full overflow-hidden"
        style={{ paddingBottom: "56.25%" }}
      >
        <div className="absolute inset-0 bg-[oklch(0.10_0.04_255)]">
          {/* CRT scanline texture */}
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none z-[1]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
            }}
          />

          {/* Animated scan sweep */}
          <ScanLine />

          {/* Corner bracket decorators — enhanced with cyan glow */}
          {(["tl", "tr", "bl", "br"] as const).map((pos) => (
            <div
              key={pos}
              className="absolute w-6 h-6"
              style={{
                top: pos.startsWith("t") ? 12 : "auto",
                bottom: pos.startsWith("b") ? 12 : "auto",
                left: pos.endsWith("l") ? 12 : "auto",
                right: pos.endsWith("r") ? 12 : "auto",
                borderTop: pos.startsWith("t")
                  ? "2px solid rgba(34,211,238,0.9)"
                  : "none",
                borderBottom: pos.startsWith("b")
                  ? "2px solid rgba(34,211,238,0.9)"
                  : "none",
                borderLeft: pos.endsWith("l")
                  ? "2px solid rgba(34,211,238,0.9)"
                  : "none",
                borderRight: pos.endsWith("r")
                  ? "2px solid rgba(34,211,238,0.9)"
                  : "none",
                filter: "drop-shadow(0 0 4px rgba(34,211,238,0.7))",
                zIndex: 2,
              }}
            />
          ))}

          {/* Pulsing LIVE badge — top-right inside frame */}
          <div
            className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2 py-1 rounded"
            style={{
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(34,211,238,0.5)",
              backdropFilter: "blur(4px)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-red-500"
              style={{ animation: "pulse 1s ease-in-out infinite" }}
            />
            <span className="text-[10px] font-bold font-mono text-red-400 tracking-widest">
              REC
            </span>
          </div>

          {/* Grid overlay — subtle targeting reticle */}
          <div
            className="absolute inset-0 pointer-events-none z-[1] opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(34,211,238,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.8) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Center placeholder */}
          {objects.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground/40 z-[3]">
              <Camera className="w-12 h-12" />
              <span className="text-sm font-medium font-mono">
                Scanning surface water…
              </span>
            </div>
          )}

          {/* Bounding Boxes */}
          {!isLoading &&
            objects.map((obj, i) => (
              <BoundingBox key={`${obj.objectType}-${i}`} obj={obj} />
            ))}

          {/* Loading shimmer */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-[3]">
              <div className="flex flex-col items-center gap-3 text-muted-foreground/50">
                <Activity className="w-8 h-8 animate-pulse" />
                <span className="text-xs font-mono">
                  Initializing detection…
                </span>
              </div>
            </div>
          )}

          {/* Timestamp watermark */}
          <div
            className="absolute bottom-2 left-3 font-mono text-[10px] z-[3]"
            style={{ color: "rgba(34,211,238,0.65)" }}
          >
            {new Date().toLocaleString()}
          </div>
          {/* Object count watermark */}
          <div
            className="absolute bottom-2 right-3 font-mono text-[10px] z-[3]"
            style={{ color: "rgba(34,211,238,0.65)" }}
          >
            OBJECTS: {objects.length}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatsRow({ result }: { result: DetectionResult | null }) {
  const count = result ? Number(result.totalCount) : 0;
  const avg = result ? avgConfidence(result.objects) : 0;
  const ts = result ? formatTimestamp(result.timestamp) : "—";
  const avgPct = Math.round(avg * 100);

  const isHighConf = avgPct >= 80;
  const confColor = isHighConf
    ? "text-red-500"
    : avgPct >= 60
      ? "text-amber-500"
      : "text-primary";

  const stats = [
    {
      id: "objects",
      icon: <Eye className="w-4 h-4 text-primary" />,
      label: "Objects Detected",
      value: count.toString(),
      sub: "in current frame",
      accent: "text-primary",
      ocid: "detection.stat.objects",
    },
    {
      id: "time",
      icon: <Clock className="w-4 h-4 text-accent" />,
      label: "Last Detection",
      value: ts,
      sub: "timestamp",
      accent: "text-accent",
      ocid: "detection.stat.last_detection",
    },
    {
      id: "conf",
      icon: <Activity className="w-4 h-4" style={{ color: "#22d3ee" }} />,
      label: "Avg Confidence",
      value: `${avgPct}%`,
      sub: "across detections",
      accent: confColor,
      ocid: "detection.stat.confidence",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4" data-ocid="detection.stats_row">
      {stats.map((s) => (
        <div
          key={s.id}
          className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1.5 shadow-sm hover:shadow-md transition-shadow duration-200"
          data-ocid={s.ocid}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <p className="text-xs text-muted-foreground truncate">{s.label}</p>
          </div>
          <p
            className={`text-2xl font-bold font-mono leading-tight tracking-tight ${s.accent}`}
          >
            {s.value}
          </p>
          <p className="text-[10px] text-muted-foreground/60">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Object Card ──────────────────────────────────────────────────────────────

function ObjectCard({ obj, index }: { obj: DetectedObject; index: number }) {
  const pct = Math.round(obj.confidence * 100);
  const accent = getObjectAccent(obj.objectType);
  const confColor = getConfidenceColor(obj.confidence);
  const Icon = getObjectIcon(obj.objectType);

  // Gradient for confidence bar based on confidence level
  const barGradient =
    obj.confidence >= 0.8
      ? "linear-gradient(90deg, #f97316, #ef4444)"
      : obj.confidence >= 0.6
        ? "linear-gradient(90deg, #facc15, #f59e0b)"
        : "linear-gradient(90deg, #22d3ee, #0891b2)";

  const confidenceLabel =
    obj.confidence >= 0.8 ? "High" : obj.confidence >= 0.6 ? "Medium" : "Low";

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-all duration-200 shadow-sm hover:shadow-md"
      data-ocid={`detection.object.${index + 1}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `${accent}1a`,
            border: `1.5px solid ${accent}55`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground capitalize truncate leading-tight">
            {obj.objectType}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Object detected in frame
          </p>
        </div>
        <div
          className="px-2 py-0.5 rounded-full text-xs font-bold font-mono shrink-0"
          style={{
            background: `${confColor.border}20`,
            color: confColor.border,
            border: `1px solid ${confColor.border}40`,
          }}
        >
          {pct}%
        </div>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Confidence
          </span>
          <span
            className="text-[10px] font-semibold"
            style={{ color: confColor.border }}
          >
            {confidenceLabel}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: barGradient }}
          />
        </div>
      </div>

      {/* Bounding box coords + timestamp */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <div className="font-mono text-[10px] text-muted-foreground/60 flex gap-2">
          <span>x:{Math.round(obj.x)}</span>
          <span>y:{Math.round(obj.y)}</span>
          <span>w:{Math.round(obj.width)}</span>
          <span>h:{Math.round(obj.height)}</span>
        </div>
      </div>
    </div>
  );
}

function DetectedObjectsList({
  objects,
  isLoading,
}: { objects: DetectedObject[]; isLoading: boolean }) {
  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      data-ocid="detection.objects_panel"
    >
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/20">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Trash2 className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          Detected Objects
        </span>
        <Badge
          variant="secondary"
          className="ml-auto text-xs font-mono font-bold"
        >
          {objects.length}
        </Badge>
      </div>
      <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </>
        ) : objects.length === 0 ? (
          <div
            className="text-center py-10 text-muted-foreground"
            data-ocid="detection.empty_state"
          >
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
              <Eye className="w-7 h-7 opacity-30" />
            </div>
            <p className="text-sm font-medium">No objects detected</p>
            <p className="text-xs mt-1 opacity-60">Scanning surface water…</p>
          </div>
        ) : (
          objects.map((obj, i) => (
            <ObjectCard key={`${obj.objectType}-${i}`} obj={obj} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Detection History Timeline ───────────────────────────────────────────────

function DetectionHistory({ history }: { history: HistoryEntry[] }) {
  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      data-ocid="detection.history_panel"
    >
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/20">
        <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
          <Clock className="w-3.5 h-3.5 text-accent" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          Frame History
        </span>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          Last {Math.min(5, history.length || 5)} frames
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {history.length === 0 ? (
          <div
            className="px-4 py-6 text-center text-muted-foreground text-sm"
            data-ocid="detection.history.empty_state"
          >
            No frames captured yet
          </div>
        ) : (
          history.map((entry, i) => {
            const isActive = i === 0;
            const hasObjects = entry.objectCount > 0;

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors duration-150 ${
                  isActive ? "bg-primary/5" : "hover:bg-muted/30"
                }`}
                data-ocid={`detection.history.item.${i + 1}`}
              >
                {/* Thumbnail placeholder */}
                <div
                  className="w-14 h-10 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                  style={{
                    background: "oklch(0.10 0.04 255)",
                    border: isActive
                      ? "1.5px solid rgba(34,211,238,0.7)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: isActive
                      ? "0 0 8px rgba(34,211,238,0.3)"
                      : "none",
                  }}
                >
                  <Camera
                    className="w-4 h-4"
                    style={{
                      color: isActive
                        ? "rgba(34,211,238,0.9)"
                        : "rgba(255,255,255,0.2)",
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        hasObjects ? "bg-red-400" : "bg-accent"
                      } ${isActive ? "animate-pulse" : ""}`}
                    />
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                    {isActive && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono"
                        style={{
                          background: "rgba(34,211,238,0.15)",
                          color: "rgba(34,211,238,0.9)",
                          border: "1px solid rgba(34,211,238,0.3)",
                        }}
                      >
                        CURRENT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/70 truncate">
                    {hasObjects
                      ? `${entry.objectCount} object${entry.objectCount > 1 ? "s" : ""} detected`
                      : "Clean frame"}
                  </p>
                </div>

                {/* Badge */}
                <Badge
                  variant={hasObjects ? "destructive" : "secondary"}
                  className="text-xs font-mono shrink-0"
                >
                  {entry.objectCount}
                </Badge>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Confidence Legend ────────────────────────────────────────────────────────

function ConfidenceLegend() {
  const levels = [
    {
      label: "High Confidence",
      range: "≥ 80%",
      color: "#ef4444",
      note: "Urgent",
    },
    {
      label: "Medium Confidence",
      range: "60–79%",
      color: "#facc15",
      note: "Caution",
    },
    {
      label: "Low Confidence",
      range: "< 60%",
      color: "#22d3ee",
      note: "Review",
    },
  ];

  return (
    <div
      className="bg-muted/30 border border-border rounded-xl p-4 shadow-sm"
      data-ocid="detection.legend_panel"
    >
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Confidence Levels
      </p>
      <div className="space-y-2.5">
        {levels.map((l) => (
          <div
            key={l.label}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{
                  background: l.color,
                  boxShadow: `0 0 4px ${l.color}60`,
                }}
              />
              <span className="text-xs text-foreground truncate">
                {l.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-[10px] text-muted-foreground">
                {l.range}
              </span>
              <span
                className="text-[10px] font-medium px-1 py-0.5 rounded"
                style={{
                  background: `${l.color}18`,
                  color: l.color,
                }}
              >
                {l.note}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DetectionPage() {
  const { data: detection, isLoading } = useDetections();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const frameCounterRef = useRef(0);

  // Build history from incoming detection results
  useEffect(() => {
    if (!detection) return;
    const id = frameCounterRef.current++;
    setHistory((prev) => {
      if (prev[0]?.timestamp === detection.timestamp) return prev;
      const entry: HistoryEntry = {
        timestamp: detection.timestamp,
        objectCount: Number(detection.totalCount),
        id,
      };
      return [entry, ...prev].slice(0, 5);
    });
  }, [detection]);

  const objects: DetectedObject[] = detection?.objects ?? [];

  return (
    <div
      className="container mx-auto px-4 py-8 space-y-6"
      data-ocid="detection.page"
    >
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            AI Object Detection
          </h1>
          <p className="text-sm text-muted-foreground">
            Live camera feed and waste detection analysis
          </p>
        </div>
        <div
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
          style={{
            background: "rgba(34,211,238,0.07)",
            borderColor: "rgba(34,211,238,0.3)",
          }}
          data-ocid="detection.system_status"
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#22d3ee" }}
          />
          <span className="text-xs font-medium text-foreground">
            System Active
          </span>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4" data-ocid="detection.loading_state">
          <Skeleton
            className="w-full rounded-xl"
            style={{ paddingBottom: "56.25%", height: 0 }}
          />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Main layout */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Camera feed + stats (spans 2 cols) */}
          <div className="lg:col-span-2 space-y-5">
            <CameraFeed objects={objects} isLoading={isLoading} />
            <StatsRow result={detection ?? null} />
            <DetectionHistory history={history} />
          </div>

          {/* Right: Objects list + legend */}
          <div className="lg:col-span-1 space-y-4">
            <DetectedObjectsList objects={objects} isLoading={isLoading} />
            <ConfidenceLegend />
          </div>
        </div>
      )}

      {/* Scanline keyframe */}
      <style>{`
        @keyframes scanline {
          0% { top: 0%; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
