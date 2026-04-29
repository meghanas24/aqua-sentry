import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePollutionHistory, useSensorHistory } from "@/hooks/useHistory";
import type { PollutionHistoryEntry, SensorHistoryEntry } from "@/types/water";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Download,
  FileText,
  FlaskConical,
  History,
  Minus,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(ts: bigint): string {
  const d = new Date(Number(ts) / 1_000_000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatTimestampFull(ts: bigint): string {
  const d = new Date(Number(ts) / 1_000_000);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPollutionClass(score: number): {
  label: string;
  color: string;
  badgeClass: string;
} {
  if (score <= 30)
    return {
      label: "Clean",
      color: "#22c55e",
      badgeClass:
        "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
    };
  if (score <= 60)
    return {
      label: "Moderate",
      color: "#f59e0b",
      badgeClass: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    };
  return {
    label: "Highly Polluted",
    color: "#ef4444",
    badgeClass: "bg-red-500/10 text-red-600 border border-red-500/20",
  };
}

function getPhLabel(ph: number): { label: string; color: string } {
  if (ph < 6.5) return { label: "Acidic", color: "#f59e0b" };
  if (ph > 8.5) return { label: "Alkaline", color: "#8b5cf6" };
  return { label: "Normal", color: "#22c55e" };
}

// ─── Fallback/seed data ───────────────────────────────────────────────────────

function generateSeedPollution(): {
  time: string;
  score: number;
  rawTs: bigint;
}[] {
  const now = Date.now();
  return Array.from({ length: 24 }, (_, i) => {
    const ts = BigInt((now - (23 - i) * 3_600_000) * 1_000_000);
    const base = 35 + Math.sin(i * 0.4) * 18 + Math.random() * 10;
    return {
      time: formatTimestamp(ts),
      score: Math.round(Math.min(100, Math.max(0, base))),
      rawTs: ts,
    };
  });
}

function generateSeedSensors(): {
  time: string;
  ph: number;
  tds: number;
  turbidity: number;
  rawTs: bigint;
}[] {
  const now = Date.now();
  return Array.from({ length: 24 }, (_, i) => {
    const ts = BigInt((now - (23 - i) * 3_600_000) * 1_000_000);
    return {
      time: formatTimestamp(ts),
      ph: Number.parseFloat(
        (7.0 + Math.sin(i * 0.3) * 0.9 + Math.random() * 0.3).toFixed(2),
      ),
      tds: Math.round(320 + Math.sin(i * 0.5) * 130 + Math.random() * 50),
      turbidity: Number.parseFloat(
        (4 + Math.sin(i * 0.4) * 2.5 + Math.random()).toFixed(1),
      ),
      rawTs: ts,
    };
  });
}

// ─── Derived data from backend ────────────────────────────────────────────────

function toPollutionChartData(entries: PollutionHistoryEntry[]) {
  return entries.map((e) => ({
    time: formatTimestamp(e.timestamp),
    score: Number(e.score),
    rawTs: e.timestamp,
  }));
}

function toSensorChartData(entries: SensorHistoryEntry[]) {
  return entries.map((e) => ({
    time: formatTimestamp(e.timestamp),
    ph: e.ph,
    tds: e.tds,
    turbidity: e.turbidity,
    rawTs: e.timestamp,
  }));
}

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

interface PollutionTooltipPayload {
  time: string;
  score: number;
  rawTs: bigint;
}

function PollutionTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PollutionTooltipPayload;
  const { label, color } = getPollutionClass(d.score);
  return (
    <div className="bg-card border border-border/80 rounded-xl px-4 py-3 shadow-xl text-sm backdrop-blur-sm">
      <p className="text-muted-foreground text-xs mb-1.5 font-medium">
        {formatTimestampFull(d.rawTs)}
      </p>
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="font-bold text-base" style={{ color }}>
          {d.score}
          <span className="text-xs font-normal text-muted-foreground ml-1">
            / 100
          </span>
        </p>
      </div>
      <p className="text-xs mt-1 font-medium" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

interface SensorTooltipPayload {
  time: string;
  ph: number;
  tds: number;
  turbidity: number;
  rawTs: bigint;
}

function PhTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SensorTooltipPayload;
  const { label, color } = getPhLabel(d.ph);
  return (
    <div className="bg-card border border-border/80 rounded-xl px-4 py-3 shadow-xl text-sm backdrop-blur-sm">
      <p className="text-muted-foreground text-xs mb-1.5 font-medium">
        {formatTimestampFull(d.rawTs)}
      </p>
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="font-bold text-base" style={{ color }}>
          pH {d.ph}
        </p>
      </div>
      <p className="text-xs mt-1 font-medium" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

function TdsTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SensorTooltipPayload;
  const safe = d.tds <= 500;
  const color = safe ? "#22c55e" : "#ef4444";
  return (
    <div className="bg-card border border-border/80 rounded-xl px-4 py-3 shadow-xl text-sm backdrop-blur-sm">
      <p className="text-muted-foreground text-xs mb-1.5 font-medium">
        {formatTimestampFull(d.rawTs)}
      </p>
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="font-bold text-base" style={{ color }}>
          {d.tds}
          <span className="text-xs font-normal text-muted-foreground ml-1">
            ppm
          </span>
        </p>
      </div>
      <p className="text-xs mt-1 font-medium" style={{ color }}>
        {safe ? "Within safe limit" : "Exceeds 500 ppm"}
      </p>
    </div>
  );
}

// ─── Sensor Stat Row ──────────────────────────────────────────────────────────

interface SensorStatRowProps {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  min: number;
  max: number;
  avg: number;
  unit: string;
  safeMin?: number;
  safeMax?: number;
  ocid: string;
}

function SensorStatRow({
  label,
  icon,
  iconBg,
  min,
  max,
  avg,
  unit,
  safeMin,
  safeMax,
  ocid,
}: SensorStatRowProps) {
  const barMin = safeMin ?? min * 0.8;
  const barMax = safeMax ?? max * 1.2;
  const range = barMax - barMin || 1;

  const minPct = Math.max(0, Math.min(100, ((min - barMin) / range) * 100));
  const maxPct = Math.max(0, Math.min(100, ((max - barMin) / range) * 100));
  const avgPct = Math.max(0, Math.min(100, ((avg - barMin) / range) * 100));

  const isAvgWarning =
    safeMin !== undefined && safeMax !== undefined
      ? avg < safeMin || avg > safeMax
      : false;

  return (
    <Card
      className="bg-card border-border rounded-xl shadow-md overflow-hidden"
      data-ocid={ocid}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">
              {unit}
              {safeMin !== undefined &&
                safeMax !== undefined &&
                ` · Safe: ${safeMin}–${safeMax}`}
            </p>
          </div>
          {isAvgWarning && (
            <Badge
              variant="destructive"
              className="ml-auto text-xs px-2 py-0.5"
            >
              Warning
            </Badge>
          )}
        </div>

        {/* Min / Avg / Max stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            {
              sublabel: "Min",
              val: min,
              icon: <ArrowDown className="w-3 h-3 text-emerald-500" />,
            },
            {
              sublabel: "Avg",
              val: avg,
              icon: <Minus className="w-3 h-3 text-primary" />,
            },
            {
              sublabel: "Max",
              val: max,
              icon: <ArrowUp className="w-3 h-3 text-amber-500" />,
            },
          ].map(({ sublabel, val, icon: statIcon }) => (
            <div
              key={sublabel}
              className="bg-muted/40 rounded-lg p-2.5 text-center"
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                {statIcon}
                <span className="text-xs text-muted-foreground font-medium">
                  {sublabel}
                </span>
              </div>
              <p className="text-base font-bold text-foreground">
                {typeof val === "number" && val % 1 !== 0
                  ? val.toFixed(2)
                  : val}
              </p>
            </div>
          ))}
        </div>

        {/* Range bar */}
        <div className="space-y-1.5">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            {/* safe zone highlight */}
            {safeMin !== undefined && safeMax !== undefined && (
              <div
                className="absolute top-0 h-full bg-emerald-500/20 rounded-full"
                style={{
                  left: `${Math.max(0, ((safeMin - barMin) / range) * 100)}%`,
                  width: `${Math.min(100, ((safeMax - safeMin) / range) * 100)}%`,
                }}
              />
            )}
            {/* min–max span */}
            <div
              className="absolute top-0 h-full bg-primary/30 rounded-full"
              style={{
                left: `${minPct}%`,
                width: `${Math.max(2, maxPct - minPct)}%`,
              }}
            />
            {/* avg marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-card shadow-md"
              style={{
                left: `calc(${avgPct}% - 6px)`,
                backgroundColor: isAvgWarning ? "#ef4444" : "#06b6d4",
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{safeMin ?? barMin.toFixed(1)}</span>
            <span className="text-xs font-medium text-primary">
              avg{" "}
              {typeof avg === "number" && avg % 1 !== 0 ? avg.toFixed(2) : avg}{" "}
              {unit}
            </span>
            <span>{safeMax ?? barMax.toFixed(1)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Summary Stat Card ────────────────────────────────────────────────────────

interface SummaryStatCardProps {
  label: string;
  value: string;
  unit?: string;
  trend: "up" | "down" | "neutral";
  trendLabel?: string;
  valueColor?: string;
  accentBg: string;
  accentIcon: React.ReactNode;
  ocid: string;
}

function SummaryStatCard({
  label,
  value,
  unit,
  trend,
  trendLabel,
  valueColor = "text-foreground",
  accentBg,
  accentIcon,
  ocid,
}: SummaryStatCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  const trendColor =
    trend === "up"
      ? "text-red-500"
      : trend === "down"
        ? "text-emerald-500"
        : "text-muted-foreground";
  return (
    <Card
      className="bg-card border-border rounded-xl shadow-md"
      data-ocid={ocid}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium leading-tight max-w-[80%]">
            {label}
          </p>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accentBg}`}
          >
            {accentIcon}
          </div>
        </div>
        <div className="flex items-end gap-1.5 mb-2">
          <span className={`text-3xl font-display font-bold ${valueColor}`}>
            {value}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>
          )}
        </div>
        {TrendIcon && trendLabel && (
          <div className={`flex items-center gap-1.5 text-xs ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span className="font-medium">{trendLabel}</span>
          </div>
        )}
        {!TrendIcon && trendLabel && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Minus className="w-3.5 h-3.5" />
            <span>{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Chart Header ─────────────────────────────────────────────────────────────

interface ChartHeaderProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  currentValue?: string;
  currentUnit?: string;
  currentBadgeClass?: string;
  legend?: { color: string; label: string }[];
  badge?: React.ReactNode;
  minVal?: string;
  maxVal?: string;
  avgVal?: string;
}

function ChartHeader({
  icon,
  iconBg,
  title,
  subtitle,
  currentValue,
  currentUnit,
  currentBadgeClass,
  legend,
  badge,
  minVal,
  maxVal,
  avgVal,
}: ChartHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              {currentValue && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${currentBadgeClass}`}
                >
                  {currentValue}
                  {currentUnit && (
                    <span className="font-normal opacity-80 ml-0.5">
                      {currentUnit}
                    </span>
                  )}
                </span>
              )}
              {badge}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
        {legend && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
            {legend.map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span
                  className="w-4 h-1 rounded-full inline-block"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      {(minVal !== undefined ||
        maxVal !== undefined ||
        avgVal !== undefined) && (
        <div className="flex items-center gap-4 py-2 px-3 bg-muted/30 rounded-lg border border-border/50">
          {minVal !== undefined && (
            <div className="flex items-center gap-1.5">
              <ArrowDown className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Min</span>
              <span className="text-xs font-semibold text-foreground">
                {minVal}
              </span>
            </div>
          )}
          {avgVal !== undefined && (
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-500" />
              <span className="text-xs text-muted-foreground">Avg</span>
              <span className="text-xs font-semibold text-foreground">
                {avgVal}
              </span>
            </div>
          )}
          {maxVal !== undefined && (
            <div className="flex items-center gap-1.5">
              <ArrowUp className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-muted-foreground">Max</span>
              <span className="text-xs font-semibold text-foreground">
                {maxVal}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="w-full h-64 flex flex-col gap-3 p-1">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-5 w-16 rounded-full ml-2" />
      </div>
      <Skeleton className="flex-1 w-full rounded-xl" />
      <div className="flex gap-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function downloadCSV(
  pollutionData: { time: string; score: number }[],
  sensorData: { time: string; ph: number; tds: number; turbidity: number }[],
) {
  const rows: string[] = ["Time,Pollution Score,pH,TDS (ppm),Turbidity (NTU)"];
  const maxLen = Math.max(pollutionData.length, sensorData.length);
  for (let i = 0; i < maxLen; i++) {
    const p = pollutionData[i];
    const s = sensorData[i];
    rows.push(
      [
        p?.time ?? s?.time ?? "",
        p?.score ?? "",
        s?.ph ?? "",
        s?.tds ?? "",
        s?.turbidity ?? "",
      ].join(","),
    );
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aqua-sentry-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { data: rawPollution, isLoading: pollutionLoading } =
    usePollutionHistory();
  const { data: rawSensor, isLoading: sensorLoading } = useSensorHistory();

  const pollutionData = useMemo(
    () =>
      rawPollution && rawPollution.length > 0
        ? toPollutionChartData(rawPollution)
        : generateSeedPollution(),
    [rawPollution],
  );

  const sensorData = useMemo(
    () =>
      rawSensor && rawSensor.length > 0
        ? toSensorChartData(rawSensor)
        : generateSeedSensors(),
    [rawSensor],
  );

  // ── Derived stats
  const avgScore = useMemo(() => {
    if (!pollutionData.length) return 0;
    return Math.round(
      pollutionData.reduce((s, d) => s + d.score, 0) / pollutionData.length,
    );
  }, [pollutionData]);

  const minScore = useMemo(
    () =>
      pollutionData.length ? Math.min(...pollutionData.map((d) => d.score)) : 0,
    [pollutionData],
  );
  const maxScore = useMemo(
    () =>
      pollutionData.length ? Math.max(...pollutionData.map((d) => d.score)) : 0,
    [pollutionData],
  );

  const prevAvgScore = useMemo(() => {
    if (pollutionData.length < 4) return avgScore;
    const half = Math.floor(pollutionData.length / 2);
    return Math.round(
      pollutionData.slice(0, half).reduce((s, d) => s + d.score, 0) / half,
    );
  }, [pollutionData, avgScore]);

  const phValues = useMemo(() => sensorData.map((d) => d.ph), [sensorData]);
  const minPh = useMemo(
    () => (phValues.length ? Math.min(...phValues) : 0),
    [phValues],
  );
  const maxPh = useMemo(
    () => (phValues.length ? Math.max(...phValues) : 0),
    [phValues],
  );
  const avgPh = useMemo(
    () =>
      phValues.length
        ? Number(
            (phValues.reduce((a, b) => a + b, 0) / phValues.length).toFixed(2),
          )
        : 0,
    [phValues],
  );

  const tdsValues = useMemo(() => sensorData.map((d) => d.tds), [sensorData]);
  const minTds = useMemo(
    () => (tdsValues.length ? Math.min(...tdsValues) : 0),
    [tdsValues],
  );
  const maxTds = useMemo(
    () => (tdsValues.length ? Math.max(...tdsValues) : 0),
    [tdsValues],
  );
  const avgTds = useMemo(
    () =>
      tdsValues.length
        ? Math.round(tdsValues.reduce((a, b) => a + b, 0) / tdsValues.length)
        : 0,
    [tdsValues],
  );

  const turbidityValues = useMemo(
    () => sensorData.map((d) => d.turbidity),
    [sensorData],
  );
  const minTurbidity = useMemo(
    () => (turbidityValues.length ? Math.min(...turbidityValues) : 0),
    [turbidityValues],
  );
  const maxTurbidity = useMemo(
    () => (turbidityValues.length ? Math.max(...turbidityValues) : 0),
    [turbidityValues],
  );
  const avgTurbidity = useMemo(
    () =>
      turbidityValues.length
        ? Number(
            (
              turbidityValues.reduce((a, b) => a + b, 0) /
              turbidityValues.length
            ).toFixed(1),
          )
        : 0,
    [turbidityValues],
  );

  const latestScore =
    pollutionData[pollutionData.length - 1]?.score ?? avgScore;
  const latestPh = sensorData[sensorData.length - 1]?.ph ?? avgPh;
  const latestTds = sensorData[sensorData.length - 1]?.tds ?? avgTds;

  const scoreTrend =
    avgScore > prevAvgScore
      ? "up"
      : avgScore < prevAvgScore
        ? "down"
        : "neutral";

  const axisStyle = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };
  const gridColor = "hsl(var(--border))";

  return (
    <div
      className="container mx-auto px-4 py-8 space-y-8 max-w-7xl"
      data-ocid="history.page"
    >
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
            <History className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Data History & Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Last 24 hours of sensor logs and pollution trends
            </p>
          </div>
        </div>

        {/* Export buttons */}
        <div
          className="flex items-center gap-3"
          data-ocid="history.export_section"
        >
          <Button
            variant="default"
            size="sm"
            className="gap-2 transition-smooth shadow-sm"
            data-ocid="history.download_csv_button"
            onClick={() => {
              downloadCSV(pollutionData, sensorData);
              toast.success("CSV exported", {
                description: "Your water quality history has been downloaded.",
              });
            }}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 transition-smooth"
            data-ocid="history.download_report_button"
            onClick={() =>
              toast.info("PDF export coming soon", {
                description:
                  "This feature is under development. Use CSV export for now.",
              })
            }
          >
            <FileText className="w-4 h-4" />
            PDF Report
          </Button>
        </div>
      </div>

      {/* ── 24h Summary Stats ──────────────────────────────────────────── */}
      <section data-ocid="history.stats_section">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          24-Hour Summary
        </h2>
        {sensorLoading || pollutionLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(["a", "b", "c", "d"] as const).map((k) => (
              <Card key={k} className="bg-card border-border rounded-xl">
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                  <Skeleton className="h-9 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryStatCard
              label="Avg Pollution Score"
              value={String(avgScore)}
              unit="/100"
              trend={scoreTrend}
              trendLabel={
                scoreTrend === "up"
                  ? `+${avgScore - prevAvgScore} vs earlier half`
                  : scoreTrend === "down"
                    ? `${avgScore - prevAvgScore} vs earlier half`
                    : "Stable trend"
              }
              valueColor={
                avgScore <= 30
                  ? "text-emerald-500"
                  : avgScore <= 60
                    ? "text-amber-500"
                    : "text-destructive"
              }
              accentBg="bg-amber-500/10"
              accentIcon={<TrendingUp className="w-4 h-4 text-amber-500" />}
              ocid="history.stat.avg_score"
            />
            <SummaryStatCard
              label="Peak pH (24h)"
              value={maxPh.toFixed(1)}
              unit="pH"
              trend={maxPh > 8.5 ? "up" : "neutral"}
              trendLabel={
                maxPh > 8.5 ? "Above alkaline threshold" : "Within normal range"
              }
              accentBg="bg-emerald-500/10"
              accentIcon={<Waves className="w-4 h-4 text-emerald-500" />}
              ocid="history.stat.peak_ph"
            />
            <SummaryStatCard
              label="Min Turbidity"
              value={minTurbidity.toFixed(1)}
              unit="NTU"
              trend="down"
              trendLabel="Best clarity in period"
              valueColor="text-cyan-500"
              accentBg="bg-cyan-500/10"
              accentIcon={<Activity className="w-4 h-4 text-cyan-500" />}
              ocid="history.stat.min_turbidity"
            />
            <SummaryStatCard
              label="Max TDS"
              value={String(maxTds)}
              unit="ppm"
              trend={maxTds > 500 ? "up" : "neutral"}
              trendLabel={
                maxTds > 500 ? "Exceeded 500 ppm limit" : "Within safe limit"
              }
              valueColor={maxTds > 500 ? "text-destructive" : "text-foreground"}
              accentBg={maxTds > 500 ? "bg-red-500/10" : "bg-primary/10"}
              accentIcon={
                <FlaskConical
                  className={`w-4 h-4 ${maxTds > 500 ? "text-destructive" : "text-primary"}`}
                />
              }
              ocid="history.stat.max_tds"
            />
          </div>
        )}
      </section>

      {/* ── Pollution Score History (Area Chart) ───────────────────────── */}
      <section data-ocid="history.pollution_chart_section">
        <Card className="bg-card border-border rounded-xl shadow-md overflow-hidden">
          <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
            {pollutionLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            ) : (
              <ChartHeader
                icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
                iconBg="bg-amber-500/10"
                title="Pollution Score History"
                subtitle="Last 24 hours · Scale 0–100"
                currentValue={String(latestScore)}
                currentUnit="/100"
                currentBadgeClass={getPollutionClass(latestScore).badgeClass}
                legend={[
                  { color: "#22c55e", label: "Clean ≤30" },
                  { color: "#f59e0b", label: "Moderate ≤60" },
                  { color: "#ef4444", label: "Polluted >60" },
                ]}
                minVal={String(minScore)}
                avgVal={String(avgScore)}
                maxVal={String(maxScore)}
              />
            )}
          </CardHeader>
          <CardContent className="pt-5">
            {pollutionLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={290}>
                <AreaChart
                  data={pollutionData}
                  margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="pollGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#ef4444"
                        stopOpacity={0.55}
                      />
                      <stop
                        offset="45%"
                        stopColor="#f59e0b"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="#22c55e"
                        stopOpacity={0.08}
                      />
                    </linearGradient>
                    <linearGradient id="pollLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={gridColor}
                    vertical={false}
                    strokeOpacity={0.6}
                  />
                  <XAxis
                    dataKey="time"
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={false}
                    interval={3}
                    dy={6}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip
                    content={<PollutionTooltip />}
                    cursor={{
                      stroke: "hsl(var(--border))",
                      strokeWidth: 1,
                      strokeDasharray: "4 3",
                    }}
                  />
                  <ReferenceLine
                    y={30}
                    stroke="#22c55e"
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={{
                      value: "Clean",
                      fill: "#22c55e",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <ReferenceLine
                    y={60}
                    stroke="#f59e0b"
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={{
                      value: "Moderate",
                      fill: "#f59e0b",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Area
                    type="monotoneX"
                    dataKey="score"
                    stroke="url(#pollLine)"
                    strokeWidth={2.5}
                    fill="url(#pollGrad)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#f59e0b",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── pH Variation (Line Chart) + Sensor Stat Row side-by-side ────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* pH Chart — 2/3 width */}
        <section className="xl:col-span-2" data-ocid="history.ph_chart_section">
          <Card className="bg-card border-border rounded-xl shadow-md overflow-hidden h-full">
            <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
              {sensorLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              ) : (
                <ChartHeader
                  icon={<Waves className="w-4 h-4 text-emerald-500" />}
                  iconBg="bg-emerald-500/10"
                  title="pH Variation"
                  subtitle="Normal range: 6.5 – 8.5 · Measured in pH units"
                  currentValue={latestPh.toFixed(2)}
                  currentBadgeClass={
                    getPhLabel(latestPh).color === "#22c55e"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : getPhLabel(latestPh).color === "#f59e0b"
                        ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        : "bg-violet-500/10 text-violet-600 border border-violet-500/20"
                  }
                  legend={[
                    { color: "#f59e0b", label: "<6.5 Acidic" },
                    { color: "#22c55e", label: "Normal" },
                    { color: "#8b5cf6", label: ">8.5 Alkaline" },
                  ]}
                  minVal={minPh.toFixed(2)}
                  avgVal={avgPh.toFixed(2)}
                  maxVal={maxPh.toFixed(2)}
                />
              )}
            </CardHeader>
            <CardContent className="pt-5">
              {sensorLoading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height={270}>
                  <LineChart
                    data={sensorData}
                    margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={gridColor}
                      vertical={false}
                      strokeOpacity={0.6}
                    />
                    <XAxis
                      dataKey="time"
                      tick={axisStyle}
                      tickLine={false}
                      axisLine={false}
                      interval={3}
                      dy={6}
                    />
                    <YAxis
                      domain={[4, 10]}
                      tick={axisStyle}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                      ticks={[4, 5, 6, 6.5, 7, 8, 8.5, 9, 10]}
                    />
                    <Tooltip
                      content={<PhTooltip />}
                      cursor={{
                        stroke: "hsl(var(--border))",
                        strokeWidth: 1,
                        strokeDasharray: "4 3",
                      }}
                    />
                    <ReferenceLine
                      y={6.5}
                      stroke="#f59e0b"
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Acidic",
                        fill: "#f59e0b",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />
                    <ReferenceLine
                      y={8.5}
                      stroke="#8b5cf6"
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Alkaline",
                        fill: "#8b5cf6",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ph"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: "#06b6d4",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Sensor Stat Rows — 1/3 width */}
        <div className="space-y-4" data-ocid="history.sensor_stats_section">
          {sensorLoading ? (
            <>
              {[1, 2, 3].map((k) => (
                <Card key={k} className="bg-card border-border rounded-xl">
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <Skeleton className="h-4 w-1/2" />
                    <div className="grid grid-cols-3 gap-2">
                      <Skeleton className="h-14 rounded-lg" />
                      <Skeleton className="h-14 rounded-lg" />
                      <Skeleton className="h-14 rounded-lg" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <SensorStatRow
                label="pH"
                icon={<Waves className="w-4 h-4 text-emerald-500" />}
                iconBg="bg-emerald-500/10"
                min={minPh}
                max={maxPh}
                avg={avgPh}
                unit="pH"
                safeMin={6.5}
                safeMax={8.5}
                ocid="history.stat_row.ph"
              />
              <SensorStatRow
                label="TDS"
                icon={<FlaskConical className="w-4 h-4 text-cyan-500" />}
                iconBg="bg-cyan-500/10"
                min={minTds}
                max={maxTds}
                avg={avgTds}
                unit="ppm"
                safeMin={0}
                safeMax={500}
                ocid="history.stat_row.tds"
              />
              <SensorStatRow
                label="Turbidity"
                icon={<Activity className="w-4 h-4 text-primary" />}
                iconBg="bg-primary/10"
                min={minTurbidity}
                max={maxTurbidity}
                avg={avgTurbidity}
                unit="NTU"
                safeMin={0}
                safeMax={4}
                ocid="history.stat_row.turbidity"
              />
            </>
          )}
        </div>
      </div>

      {/* ── TDS Trend (Area Chart) ─────────────────────────────────────── */}
      <section data-ocid="history.tds_chart_section">
        <Card className="bg-card border-border rounded-xl shadow-md overflow-hidden">
          <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
            {sensorLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            ) : (
              <ChartHeader
                icon={<FlaskConical className="w-4 h-4 text-cyan-500" />}
                iconBg="bg-cyan-500/10"
                title="TDS Variation"
                subtitle="Total Dissolved Solids · Safe limit: 500 ppm"
                currentValue={String(latestTds)}
                currentUnit=" ppm"
                currentBadgeClass={
                  latestTds <= 500
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 border border-red-500/20"
                }
                badge={
                  maxTds > 500 ? (
                    <Badge variant="destructive" className="text-xs">
                      Limit Exceeded
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs text-emerald-600 border-emerald-500/30"
                    >
                      Within Limit
                    </Badge>
                  )
                }
                minVal={`${minTds} ppm`}
                avgVal={`${avgTds} ppm`}
                maxVal={`${maxTds} ppm`}
              />
            )}
          </CardHeader>
          <CardContent className="pt-5">
            {sensorLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={270}>
                <AreaChart
                  data={sensorData}
                  margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="tdsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#06b6d4"
                        stopOpacity={0.55}
                      />
                      <stop
                        offset="100%"
                        stopColor="#0891b2"
                        stopOpacity={0.04}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={gridColor}
                    vertical={false}
                    strokeOpacity={0.6}
                  />
                  <XAxis
                    dataKey="time"
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={false}
                    interval={3}
                    dy={6}
                  />
                  <YAxis
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    content={<TdsTooltip />}
                    cursor={{
                      stroke: "hsl(var(--border))",
                      strokeWidth: 1,
                      strokeDasharray: "4 3",
                    }}
                  />
                  <ReferenceLine
                    y={500}
                    stroke="#ef4444"
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={{
                      value: "Safe Limit",
                      fill: "#ef4444",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="tds"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fill="url(#tdsGrad)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#06b6d4",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Footer spacer */}
      <div className="h-6" />
    </div>
  );
}
