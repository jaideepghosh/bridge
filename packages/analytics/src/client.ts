import { createPostHogClient } from "./providers/posthog";

/**
 * Singleton analytics client instance.
 *
 * Usage:
 * ```ts
 * import { analytics } from "@bridge/analytics";
 *
 * analytics.init({ apiKey, host, app: "web" });
 * analytics.track(AnalyticsEvent.APP_LAUNCHED);
 * analytics.identify("user-123");
 * analytics.reset();
 * ```
 */
export const analytics = createPostHogClient();
