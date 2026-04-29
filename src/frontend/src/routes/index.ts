import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import AlertsPage from "../pages/AlertsPage";
import DashboardPage from "../pages/DashboardPage";
import DetectionPage from "../pages/DetectionPage";
import HistoryPage from "../pages/HistoryPage";

const rootRoute = createRootRoute({
  component: Layout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const detectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/detection",
  component: DetectionPage,
});

const alertsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/alerts",
  component: AlertsPage,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: HistoryPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  detectionRoute,
  alertsRoute,
  historyRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
