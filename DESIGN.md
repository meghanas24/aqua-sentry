# Aqua Sentry — Design Brief

**Purpose**: Real-time environmental monitoring dashboard for surface water pollution detection. Professional tech + nature aesthetic for environmental scientists and water quality professionals.

## Tone & Differentiation
Refined minimalism with purposeful motion — professional, trustworthy tech-forward platform honoring water + AI. Animated pollution gauge with spectrum transitions (green→yellow→red) conveys urgency and real-time trustworthiness. Soft shadows and rounded-xl cards create approachability without sacrifice to information density.

## Palette (OKLCH)
| Role | Light | Dark | Purpose |
|------|-------|------|---------|
| **Primary** | 0.52 0.18 254 (deep cyan) | 0.70 0.19 254 (aqua) | Core actions, interactive elements |
| **Secondary** | 0.59 0.19 254 (aqua) | 0.64 0.20 254 (bright cyan) | Secondary actions, accents |
| **Accent** | 0.58 0.23 150 (forest green) | 0.64 0.24 150 (bright green) | Safe/clean status, highlights |
| **Destructive** | 0.56 0.27 27 (semantic red) | 0.62 0.28 27 (alert red) | Pollution warnings, high alerts |
| **Warning** | 0.65 0.29 70 (semantic yellow) | 0.72 0.30 70 (bright yellow) | Moderate alerts, degrading status |
| **Success** | Same as Accent | Same as Accent | Clean/safe indicators |

## Typography
- **Display**: General Sans (400, 700) — clean, modern, geometric feel; headers, labels
- **Body**: General Sans (400, 700) — same family for cohesion; data readability prioritized
- **Mono**: Geist Mono — sensor values, timestamps, numeric data

Scale: 12px (label) → 14px (body) → 16px (section header) → 20px (card title) → 32px (dashboard title)

## Elevation & Depth
Layered hierarchy via `shadow-subtle` (cards) and `shadow-elevated` (popovers). Light mode: bright white cards on soft grey background. Dark mode: deep blue cards on darker blue backdrop. Consistent border + shadow combination creates visual organization without visual noise.

## Structural Zones
| Zone | Treatment | Notes |
|------|-----------|-------|
| **Header/Nav** | `bg-card` + `border-b`, logo left, nav center, status/user right | Sticky, compact 16px padding |
| **Main Content** | `bg-background`, 1-col mobile → 4-col desktop grid, 24px gaps | Dashboard grid with staggered entrance |
| **Sidebar (optional)** | `bg-card`, monitoring stations/filters list | Left-aligned, collapsible on mobile |
| **Footer** | `bg-muted/20` + `border-t`, device status + timestamp | Right-aligned, minimal 16px padding |

## Component Patterns
- **Cards**: `rounded-xl` (14px), `border`, `shadow-subtle`, hover lift via opacity shift
- **Buttons**: Primary (cyan bg + white text), Secondary (outline), Destructive (red), Warning (yellow)
- **Inputs**: Light border, focus ring `ring-2 ring-primary`
- **Alert Banners**: Color-coded (success=green, warning=yellow, destructive=red), icon + message + timestamp
- **Gauges**: Circular concentric rings with spectrum transitions; smooth SVG/Canvas animation on data update
- **Badges**: Small rounded-full pills for status labels, confidence % indicators

## Motion & Real-Time
- **Status Indicator**: `animate-status-live` (1.2s gentle pulse) conveys real-time data flow — reduced from 1.5s for snappier feel
- **Gauge Animation**: `animate-gauge-pulse` (2.5s smooth scale) for pollution level transitions
- **Transitions**: `.transition-smooth` (0.3s cubic-bezier) for all interactive state changes; `.transition-live` (0.4s cubic-bezier with spring easing) for data updates
- **Entrance**: Staggered fade-in (50ms between cards) for dashboard grid
- **Alert Pulse**: `animate-alert-pulse` (2s with subtle scale) for notification urgency

## Spacing & Rhythm
8px base grid (4px, 8px, 12px, 16px, 24px, 32px, 48px). Cards: 16px compact / 24px spacious padding. Gaps: 24px standard / 16px mobile. Typography: 1.4 (data labels) / 1.6 (body text).

## Accessibility & Constraints
WCAG AA+ contrast on all text/background pairs. Semantic colors: never rely on color alone (always include text labels). Icon library: lucide-react for water droplet, sensor, AI detection, alert, map, device, trending icons. Full dark mode support with perceptually consistent accent colors. Animations respect `prefers-reduced-motion`.

## Signature Detail
Animated spectrum-color gauge with concentric rings (background, mid-tone, live value) transitioning green→yellow→red as pollution increases. Pulsing live dot in corner signals real-time data streaming. Combines urgency, trustworthiness, and visual delight into a single component.
