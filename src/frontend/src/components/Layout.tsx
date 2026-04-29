import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Droplets,
  History,
  Menu,
  Scan,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", icon: BarChart3, exact: true },
  { to: "/detection", label: "AI Detection", icon: Scan, exact: false },
  { to: "/alerts", label: "Alerts & Map", icon: AlertTriangle, exact: false },
  { to: "/history", label: "History", icon: History, exact: false },
] as const;

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  function isActive(to: string, exact: boolean) {
    if (exact) return currentPath === to;
    return currentPath.startsWith(to);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-subtle">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group shrink-0"
            data-ocid="nav.brand_link"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-smooth">
              <Droplets className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="leading-none">
              <span className="font-display font-bold text-foreground text-base block">
                Aqua Sentry
              </span>
              <span className="text-muted-foreground text-[10px] font-mono tracking-widest uppercase">
                Water Monitor
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden md:flex items-center gap-0.5 flex-1 justify-center"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                data-ocid={`nav.${label.toLowerCase().replace(/\s+/g, "_")}_link`}
                className={cn(
                  "relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-smooth",
                  isActive(to, exact)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
                {isActive(to, exact) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </nav>

          {/* Live indicator */}
          <div className="hidden md:flex items-center gap-2 shrink-0 bg-primary/8 border border-primary/20 rounded-full px-3 py-1.5">
            <span
              className="w-2 h-2 rounded-full bg-primary animate-status-live"
              aria-label="Live data"
            />
            <span className="text-xs text-primary font-mono font-medium tracking-wider">
              LIVE
            </span>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-smooth"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            data-ocid="nav.mobile_menu_toggle"
          >
            {menuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <nav
            className="md:hidden border-t border-border bg-card px-4 py-3 flex flex-col gap-1"
            aria-label="Mobile navigation"
          >
            {NAV_LINKS.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                data-ocid={`nav.mobile_${label.toLowerCase().replace(/\s+/g, "_")}_link`}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                  isActive(to, exact)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}

            {/* Mobile live indicator */}
            <div className="flex items-center gap-2 mt-2 px-3 py-2 border-t border-border">
              <span className="w-2 h-2 rounded-full bg-primary animate-status-live" />
              <span className="text-xs text-primary font-mono font-medium tracking-wider">
                LIVE — Aqua Sentry Active
              </span>
            </div>
          </nav>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 bg-background">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Droplets className="w-4 h-4 text-primary" />
            <span>Aqua Sentry — Smart Surface Water Pollution Detection</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
