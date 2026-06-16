import { analytics } from "../client";
import type { AnalyticsClient } from "../types";

/**
 * React hook that returns the analytics client singleton.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const analytics = useAnalytics();
 *   analytics.track("button_clicked");
 * }
 * ```
 *
 * The hook is a thin wrapper over the singleton for API consistency
 * and to make it easy to add React-specific features later
 * (e.g., context-based overrides or testing utilities).
 */
export function useAnalytics(): AnalyticsClient {
  return analytics;
}
