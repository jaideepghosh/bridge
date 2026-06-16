"use client";

import { useEffect } from "react";
import { analytics, setupErrorTracking } from "@bridge/analytics";

/**
 * Initializes the analytics client and sets up global error tracking.
 * Wraps children without injecting any React context — the analytics
 * client is a singleton accessible via `import { analytics } from "@bridge/analytics"`.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    analytics.init({
      apiKey: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
      app: "web",
    });

    const cleanup = setupErrorTracking();
    return cleanup;
  }, []);

  return <>{children}</>;
}
