// Client
export { analytics } from "./client";

// Events
export { AnalyticsEvent } from "./events";
export type { AnalyticsEventName } from "./events";

// Hooks
export { useAnalytics } from "./hooks/useAnalytics";

// Error tracking
export { setupErrorTracking } from "./errors/setupErrorTracking";

// Types
export type {
  AnalyticsConfig,
  AnalyticsClient,
  RequestErrorMetadata,
  AppType,
  SuperProperties,
} from "./types";
