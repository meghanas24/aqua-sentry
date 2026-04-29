import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Battery,
  Bell,
  CheckCircle,
  Cpu,
  Droplets,
  FlaskConical,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Waves,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "../components/ui/skeleton";
import { useAlerts } from "../hooks/useAlerts";
import { useDeviceStatus } from "../hooks/useDeviceStatus";
import { useWaterStatus } from "../hooks/useWaterStatus";
import {
  formatTimestamp,
  generateEcoSuggestions,
  generatePredictionData,
  getPollutionBgClass,
  getPollutionColor,
  getPollutionLabel,
  getPollutionLevelLabel,
  getSensorStatus,
  getSensorStatusBadgeClass,
  getSensorStatusColor,
  normalizeScore,
} from "../lib/water-utils";
import { PollutionLevel } from "../types/water";

// ── helpers ──────────────────────────────────────────────────────────────────

function getWaterQualityText(score: number) {
  if (score <= 30) return "Good";
  if (score <= 60) return "Moderate";
  return "Poor";
}

function getPollutionBadgeStyle(score: number) {
  if (score <= 30)
    return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  if (score <= 60) return "bg-amber-100 text-amber-800 border border-amber-200";
  return "bg-red-100 text-red-800 border border-red-200";
}

function getLevelBadgeStyle(level: PollutionLevel) {
  switch (level) {
    case PollutionLevel.Low:
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    case PollutionLevel.Medium:
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case PollutionLevel.High:
      return "bg-red-100 text-red-800 border border-red-200";
  }
}

function getGaugeColor(score: number) {
  if (score <= 30) return "#059669"; // emerald-600
  if (score <= 60) return "#d97706"; // amber-600
  return "#dc2626"; // red-600
}

function getPhLabel(ph: number) {
  if (ph < 6.5) return "Acidic";
  if (ph <= 8.5) return "Neutral";
  return "Basic";
}

function getTurbidityLabel(ntu: number) {
  if (ntu < 4) return "Clear";
  if (ntu <= 10) return "Moderate";
  return "Murky";
}

function getTdsLabel(ppm: number) {
  if (ppm < 300) return "Fresh";
  if (ppm <= 600) return "Moderate";
  return "High";
}

function getPredictionTrend(points: { score: number }[]): {
  label: string;
  direction: "up" | "down" | "stable";
} {
  if (points.length < 2)
    return { label: "Expected to Stabilize", direction: "stable" };
  const first = points[0].score;
  const last = points[points.length - 1].score;
  const delta = last - first;
  if (delta > 5) return { label: "Expected to Rise", direction: "up" };
  if (delta < -5) return { label: "Expected to Improve", direction: "down" };
  return { label: "Expected to Stabilize", direction: "stable" };
}

function getPredictionConfidence(points: { score: number }[]): number {
  if (points.length === 0) return 80;
  const avg = points.reduce((s, p) => s + p.score, 0) / points.length;
  const variance =
    points.reduce((s, p) => s + (p.score - avg) ** 2, 0) / points.length;
  // Map variance 0–200 → confidence 95–70
  const confidence = Math.round(95 - (variance / 200) * 25);
  return Math.min(95, Math.max(70, confidence));
}

// ── Range Bar ─────────────────────────────────────────────────────────────────

interface RangeBarProps {
  value: number;
  min: number;
  max: number;
  normalMin: number;
  normalMax: number;
  status: "normal" | "warning" | "critical";
}

function RangeBar({
  value,
  min,
  max,
  normalMin,
  normalMax,
  status,
}: RangeBarProps) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const barColor =
    status === "normal"
      ? "bg-emerald-500"
      : status === "warning"
        ? "bg-amber-500"
        : "bg-red-500";
  const normalLeft = ((normalMin - min) / (max - min)) * 100;
  const normalWidth = ((normalMax - normalMin) / (max - min)) * 100;

  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute top-0 h-full bg-emerald-100 rounded-full"
          style={{ left: `${normalLeft}%`, width: `${normalWidth}%` }}
        />
        <div
          className={`absolute top-0 h-full w-1.5 rounded-full ${barColor} transition-all duration-500`}
          style={{ left: `calc(${pct}% - 3px)` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-muted-foreground">{min}</span>
        <span className="text-[10px] text-muted-foreground">
          Normal: {normalMin}–{normalMax}
        </span>
        <span className="text-[10px] text-muted-foreground">{max}</span>
      </div>
    </div>
  );
}

// ── Pollution Gauge ────────────────────────────────────────────────────────────

function PollutionGauge({ score }: { score: number }) {
  const color = getGaugeColor(score);
  const data = [
    { value: score, fill: color },
    { value: 100 - score, fill: "transparent" },
  ];

  return (
    <div
      className="relative flex items-center justify-center animate-gauge-pulse"
      style={{ height: 220 }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="80%"
            startAngle={180}
            endAngle={0}
            innerRadius={72}
            outerRadius={96}
            paddingAngle={0}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.fill || "empty"} fill={entry.fill} />
            ))}
          </Pie>
          {/* zone arcs behind — decorative */}
          <Pie
            data={[
              { value: 30, fill: "#d1fae5" },
              { value: 30, fill: "#fef3c7" },
              { value: 40, fill: "#fee2e2" },
            ]}
            cx="50%"
            cy="80%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={68}
            paddingAngle={1}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill="#d1fae5" />
            <Cell fill="#fef3c7" />
            <Cell fill="#fee2e2" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* center overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <span
          className="text-5xl font-display font-bold leading-none"
          style={{ color }}
        >
          {score}
        </span>
        <span className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wider">
          / 100
        </span>
      </div>
    </div>
  );
}

// ── Sensor Card ────────────────────────────────────────────────────────────────

interface SensorCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number;
  unit: string;
  label: string;
  rangeProps: Omit<RangeBarProps, "status" | "value">;
  sensorType: "ph" | "turbidity" | "tds";
  dataOcid: string;
}

function SensorCard({
  icon: Icon,
  title,
  value,
  unit,
  label,
  rangeProps,
  sensorType,
  dataOcid,
}: SensorCardProps) {
  const status = getSensorStatus(value, sensorType);
  const badgeClass = getSensorStatusBadgeClass(status);
  const valueColor = getSensorStatusColor(status);
  const warningBg =
    status === "critical"
      ? "bg-red-50 dark:bg-red-950/20"
      : status === "warning"
        ? "bg-amber-50 dark:bg-amber-950/20"
        : "";
  const warningBorder =
    status === "critical"
      ? "border-red-300 shadow-[0_0_0_1px_#fca5a5]"
      : status === "warning"
        ? "border-amber-300 shadow-[0_0_0_1px_#fcd34d]"
        : "border-border shadow-md";

  return (
    <div
      className={`border rounded-xl p-5 transition-smooth ${warningBg} ${warningBorder}`}
      data-ocid={dataOcid}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              status === "normal"
                ? "bg-primary/10"
                : status === "warning"
                  ? "bg-amber-100"
                  : "bg-red-100"
            }`}
          >
            <Icon
              className={`w-4 h-4 ${
                status === "normal"
                  ? "text-primary"
                  : status === "warning"
                    ? "text-amber-600"
                    : "text-red-600"
              }`}
            />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${badgeClass}`}
        >
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-mono font-bold ${valueColor}`}>
          {value.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground ml-1">{unit}</span>
      </div>
      {status !== "normal" && (
        <div
          className={`mt-2 text-xs font-medium flex items-center gap-1 ${
            status === "critical" ? "text-red-700" : "text-amber-700"
          }`}
        >
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {status === "critical" ? "Outside safe limit" : "Approaching limit"}
        </div>
      )}
      <RangeBar {...rangeProps} status={status} value={value} />
    </div>
  );
}

// ── Quick Stat Card ────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accentClass?: string;
  dataOcid: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accentClass = "bg-primary/10 text-primary",
  dataOcid,
}: StatCardProps) {
  return (
    <div
      className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-md hover:shadow-elevated transition-smooth"
      data-ocid={dataOcid}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accentClass}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-lg font-display font-semibold text-foreground leading-tight">
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ── Prediction Sparkline ───────────────────────────────────────────────────────

interface PredictionPanelProps {
  currentScore: number;
}

function PredictionPanel({ currentScore }: PredictionPanelProps) {
  const points = generatePredictionData(currentScore);
  const trend = getPredictionTrend(points);
  const confidence = getPredictionConfidence(points);
  const now = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const TrendIcon =
    trend.direction === "up"
      ? TrendingUp
      : trend.direction === "down"
        ? TrendingDown
        : Activity;
  const trendColor =
    trend.direction === "up"
      ? "text-red-600"
      : trend.direction === "down"
        ? "text-emerald-600"
        : "text-amber-600";
  const trendBg =
    trend.direction === "up"
      ? "bg-red-50 border-red-200 text-red-700"
      : trend.direction === "down"
        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
        : "bg-amber-50 border-amber-200 text-amber-700";

  const chartColor =
    trend.direction === "up"
      ? "#ef4444"
      : trend.direction === "down"
        ? "#059669"
        : "#d97706";

  return (
    <div
      className="bg-card border border-border rounded-xl p-5 shadow-md"
      data-ocid="dashboard.prediction.card"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">AI Forecast</h3>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          Updated {now}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3 ml-9">
        6-hour pollution trend prediction
      </p>

      {/* Trend label + confidence */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${trendBg}`}
        >
          <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
          {trend.label}
        </span>
        <span className="text-xs text-muted-foreground font-mono ml-auto">
          Confidence:{" "}
          <span className="font-semibold text-foreground">{confidence}%</span>
        </span>
      </div>

      {/* Sparkline chart */}
      <div style={{ height: 90 }}>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart
            data={points}
            margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
          >
            <defs>
              <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval={1}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickCount={3}
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
              formatter={(val: number) => [`${val}`, "Score"]}
              labelFormatter={(l) => `+${l}`}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke={chartColor}
              strokeWidth={2}
              fill="url(#predGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Eco Suggestion Box ────────────────────────────────────────────────────────

interface EcoSuggestionBoxProps {
  level: PollutionLevel;
}

function EcoSuggestionBox({ level }: EcoSuggestionBoxProps) {
  const suggestions = generateEcoSuggestions(level);

  const SuggestionIcon =
    level === PollutionLevel.Low
      ? CheckCircle
      : level === PollutionLevel.Medium
        ? AlertTriangle
        : AlertOctagon;

  const iconColor =
    level === PollutionLevel.Low
      ? "text-emerald-600"
      : level === PollutionLevel.Medium
        ? "text-amber-600"
        : "text-red-600";

  const iconBg =
    level === PollutionLevel.Low
      ? "bg-emerald-100"
      : level === PollutionLevel.Medium
        ? "bg-amber-100"
        : "bg-red-100";

  const headerBg =
    level === PollutionLevel.Low
      ? "bg-emerald-50 border-emerald-100"
      : level === PollutionLevel.Medium
        ? "bg-amber-50 border-amber-100"
        : "bg-red-50 border-red-100";

  const headerText =
    level === PollutionLevel.Low
      ? "text-emerald-800"
      : level === PollutionLevel.Medium
        ? "text-amber-800"
        : "text-red-800";

  return (
    <div
      className="bg-card border border-border rounded-xl shadow-md overflow-hidden"
      data-ocid="dashboard.eco_suggestions.card"
    >
      {/* header strip */}
      <div className={`flex items-center gap-2 px-5 py-3 border-b ${headerBg}`}>
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}
        >
          <SuggestionIcon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
        <h3 className={`text-sm font-semibold ${headerText}`}>
          Eco Recommendations
        </h3>
        <span
          className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full border ${
            level === PollutionLevel.Low
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : level === PollutionLevel.Medium
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-red-100 text-red-800 border-red-200"
          }`}
        >
          {level === PollutionLevel.Low
            ? "Healthy"
            : level === PollutionLevel.Medium
              ? "Moderate"
              : "Alert"}
        </span>
      </div>

      {/* suggestion rows */}
      <div className="divide-y divide-border">
        {suggestions.map((text, i) => (
          <div
            key={text.slice(0, 40)}
            className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors duration-150"
            data-ocid={`dashboard.eco_suggestion.item.${i + 1}`}
          >
            <div
              className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}
            >
              <SuggestionIcon className={`w-3 h-3 ${iconColor}`} />
            </div>
            <p className="text-sm text-foreground leading-snug">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skeleton layouts ───────────────────────────────────────────────────────────

function GaugeSkeleton() {
  return (
    <div
      className="flex flex-col items-center gap-4 py-6"
      data-ocid="dashboard.gauge.loading_state"
    >
      <Skeleton className="w-48 h-32 rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="w-20 h-6 rounded-full" />
        <Skeleton className="w-24 h-6 rounded-full" />
      </div>
    </div>
  );
}

function SensorSkeleton() {
  return (
    <div
      className="border border-border rounded-xl p-5 space-y-3"
      data-ocid="dashboard.sensor.loading_state"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="w-24 h-5 rounded" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
      <Skeleton className="w-20 h-9 rounded" />
      <Skeleton className="w-full h-2 rounded-full" />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { sensor, score, isLoading } = useWaterStatus();
  const { data: alertsData } = useAlerts();
  const { data: deviceData } = useDeviceStatus();

  const scoreNum = score ? normalizeScore(score.score) : 0;
  const activeAlerts = (alertsData ?? []).filter((a) => !a.isAcknowledged);
  const lastUpdate = sensor ? formatTimestamp(sensor.timestamp) : "—";
  const batteryLevel = deviceData ? Number(deviceData.batteryLevel) : null;
  const pollutionLevel = score?.level ?? PollutionLevel.Low;

  return (
    <div className="min-h-screen bg-background" data-ocid="dashboard.page">
      {/* Page Header */}
      <div className="bg-card border-b border-border shadow-subtle px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Waves className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-foreground">
              Water Quality Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time surface water pollution monitoring
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full"
            data-ocid="dashboard.live_indicator"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-status-live" />
            LIVE
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Row 1: Gauge + Sensor Cards ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Pollution Gauge */}
          <div
            className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-md"
            data-ocid="dashboard.gauge.card"
          >
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Real-Time Water Status
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Live pollution level assessment
            </p>

            {isLoading ? (
              <GaugeSkeleton />
            ) : (
              <>
                <PollutionGauge score={scoreNum} />

                {/* badges + live indicator */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  {score && (
                    <span
                      className={`text-sm font-semibold px-3 py-1 rounded-full ${getLevelBadgeStyle(score.level)}`}
                      data-ocid="dashboard.pollution_level.badge"
                    >
                      {getPollutionLevelLabel(score.level)} Pollution
                    </span>
                  )}
                  <span
                    className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${getPollutionBadgeStyle(scoreNum)}`}
                    data-ocid="dashboard.water_quality.badge"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-status-live" />
                    Water Quality: {getWaterQualityText(scoreNum)}
                  </span>
                </div>

                {/* score label */}
                <div className="text-center mt-3">
                  <p
                    className={`text-base font-display font-bold ${getPollutionColor(scoreNum)}`}
                  >
                    {getPollutionLabel(scoreNum)}
                  </p>
                </div>

                {/* zone legend */}
                <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-border">
                  {[
                    { label: "Clean", color: "bg-emerald-500", range: "0–30" },
                    {
                      label: "Moderate",
                      color: "bg-amber-500",
                      range: "31–60",
                    },
                    { label: "Polluted", color: "bg-red-500", range: "61–100" },
                  ].map((z) => (
                    <div key={z.label} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${z.color}`} />
                      <span className="text-[11px] text-muted-foreground">
                        {z.label} <span className="font-mono">{z.range}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sensor Cards */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Water Quality Sensors
              </h2>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SensorSkeleton />
                <SensorSkeleton />
                <SensorSkeleton />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SensorCard
                  icon={Thermometer}
                  title="pH Value"
                  value={sensor?.ph ?? 7.0}
                  unit="pH"
                  label={getPhLabel(sensor?.ph ?? 7.0)}
                  sensorType="ph"
                  dataOcid="dashboard.ph.card"
                  rangeProps={{
                    min: 0,
                    max: 14,
                    normalMin: 6.5,
                    normalMax: 8.5,
                  }}
                />
                <SensorCard
                  icon={Waves}
                  title="Turbidity"
                  value={sensor?.turbidity ?? 0}
                  unit="NTU"
                  label={getTurbidityLabel(sensor?.turbidity ?? 0)}
                  sensorType="turbidity"
                  dataOcid="dashboard.turbidity.card"
                  rangeProps={{ min: 0, max: 20, normalMin: 0, normalMax: 4 }}
                />
                <SensorCard
                  icon={FlaskConical}
                  title="TDS"
                  value={sensor?.tds ?? 0}
                  unit="ppm"
                  label={getTdsLabel(sensor?.tds ?? 0)}
                  sensorType="tds"
                  dataOcid="dashboard.tds.card"
                  rangeProps={{
                    min: 0,
                    max: 1000,
                    normalMin: 0,
                    normalMax: 300,
                  }}
                />
              </div>
            )}

            {/* Sensor warning note */}
            {!isLoading &&
              sensor &&
              (() => {
                const phStatus = getSensorStatus(sensor.ph, "ph");
                const turbStatus = getSensorStatus(
                  sensor.turbidity,
                  "turbidity",
                );
                const tdsStatus = getSensorStatus(sensor.tds, "tds");
                const hasWarning = [phStatus, turbStatus, tdsStatus].some(
                  (s) => s !== "normal",
                );
                return hasWarning ? (
                  <div
                    className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800"
                    data-ocid="dashboard.sensor.warning_state"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      One or more sensors are outside normal range. Review
                      readings below.
                    </span>
                  </div>
                ) : null;
              })()}

            {/* Last updated */}
            <p className="text-xs text-muted-foreground text-right">
              Last updated: <span className="font-mono">{lastUpdate}</span>
            </p>
          </div>
        </div>

        {/* ── Row 2: Quick Stats ───────────────────────────────────────── */}
        <div data-ocid="dashboard.stats.section">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              System Overview
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Bell}
              label="Active Alerts"
              value={
                activeAlerts.length > 0 ? (
                  <span className="text-red-600">{activeAlerts.length}</span>
                ) : (
                  <span className="text-emerald-600">0</span>
                )
              }
              sub={activeAlerts.length > 0 ? "Requires attention" : "All clear"}
              accentClass={
                activeAlerts.length > 0
                  ? "bg-red-100 text-red-600"
                  : "bg-emerald-100 text-emerald-600"
              }
              dataOcid="dashboard.alerts_count.card"
            />
            <StatCard
              icon={Cpu}
              label="Device Status"
              value={
                deviceData === undefined ? (
                  <Skeleton className="w-16 h-5 rounded" />
                ) : deviceData.raspberryPiOnline ? (
                  <span className="text-emerald-600">Online</span>
                ) : (
                  <span className="text-red-600">Offline</span>
                )
              }
              sub={
                deviceData?.sensorWorking ? "Sensors working" : "Sensor error"
              }
              accentClass={
                deviceData?.raspberryPiOnline
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-600"
              }
              dataOcid="dashboard.device_status.card"
            />
            <StatCard
              icon={Battery}
              label="Battery Level"
              value={
                batteryLevel !== null ? (
                  <span
                    className={
                      batteryLevel > 50
                        ? "text-emerald-600"
                        : batteryLevel > 20
                          ? "text-amber-600"
                          : "text-red-600"
                    }
                  >
                    {batteryLevel}%
                  </span>
                ) : (
                  <Skeleton className="w-12 h-5 rounded" />
                )
              }
              sub={
                batteryLevel !== null
                  ? batteryLevel > 50
                    ? "Sufficient charge"
                    : batteryLevel > 20
                      ? "Low — recharge soon"
                      : "Critical — recharge now"
                  : undefined
              }
              accentClass={
                batteryLevel !== null && batteryLevel > 50
                  ? "bg-emerald-100 text-emerald-600"
                  : batteryLevel !== null && batteryLevel > 20
                    ? "bg-amber-100 text-amber-600"
                    : "bg-red-100 text-red-600"
              }
              dataOcid="dashboard.battery.card"
            />
            <StatCard
              icon={deviceData?.wifiConnected ? Wifi : WifiOff}
              label="Connectivity"
              value={
                deviceData === undefined ? (
                  <Skeleton className="w-16 h-5 rounded" />
                ) : deviceData.wifiConnected ? (
                  <span className="text-emerald-600">Connected</span>
                ) : (
                  <span className="text-red-600">Disconnected</span>
                )
              }
              sub="WiFi / IoT link"
              accentClass={
                deviceData?.wifiConnected
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-600"
              }
              dataOcid="dashboard.connectivity.card"
            />
          </div>
        </div>

        {/* ── Row 3: AI Prediction + Eco Suggestions ──────────────────── */}
        {!isLoading && (
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            data-ocid="dashboard.insights.section"
          >
            <PredictionPanel currentScore={scoreNum} />
            <EcoSuggestionBox level={pollutionLevel} />
          </div>
        )}

        {/* ── Row 4: Recent Alerts preview ────────────────────────────── */}
        {activeAlerts.length > 0 && (
          <div data-ocid="dashboard.alerts.section">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500 animate-alert-pulse" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Active Alerts
              </h2>
              <span className="ml-auto text-xs text-muted-foreground font-mono">
                {activeAlerts.length} unacknowledged
              </span>
            </div>

            <div className="space-y-2">
              {activeAlerts.slice(0, 4).map((alert, i) => {
                const isCritical = alert.severity === "critical";
                const isHigh = alert.severity === "high";
                const bg =
                  isCritical || isHigh
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50 border-amber-200";
                const text =
                  isCritical || isHigh ? "text-red-800" : "text-amber-800";
                const iconColor =
                  isCritical || isHigh ? "text-red-500" : "text-amber-500";

                return (
                  <div
                    key={String(alert.id)}
                    className={`flex items-start gap-3 border rounded-xl px-4 py-3.5 shadow-sm ${bg}`}
                    data-ocid={`dashboard.alert.item.${i + 1}`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${text}`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {formatTimestamp(alert.timestamp)}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                        isCritical
                          ? "bg-red-100 text-red-800 border-red-200"
                          : isHigh
                            ? "bg-red-100 text-red-700 border-red-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No alerts empty state */}
        {!isLoading && activeAlerts.length === 0 && (
          <div
            className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4"
            data-ocid="dashboard.alerts.empty_state"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Droplets className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                All systems normal
              </p>
              <p className="text-xs text-emerald-700">
                No active pollution alerts. Water quality is within acceptable
                parameters.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
