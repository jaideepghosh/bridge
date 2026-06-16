import { useEffect } from "react";
import { analytics, setupErrorTracking } from "@bridge/analytics";

/**
 * Initializes the analytics client for the desktop (Tauri) app
 * and sets up global error tracking.
 *
 * Reads PostHog config from Vite environment variables
 * (VITE_POSTHOG_PROJECT_TOKEN, VITE_POSTHOG_HOST).
 *
 * Also wires into the browser `beforeunload` event to track app close.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apiKey = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN as string;
    const host = import.meta.env.VITE_POSTHOG_HOST as string;

    if (!apiKey || !host) {
      console.warn(
        "[analytics] Missing VITE_POSTHOG_PROJECT_TOKEN or VITE_POSTHOG_HOST. Analytics disabled."
      );
      return;
    }

    analytics.init({
      apiKey,
      host,
      app: "desktop",
    });

    analytics.trackAppLaunch();

    const cleanupErrorTracking = setupErrorTracking();

    // Track app close when the window is about to unload
    function handleBeforeUnload() {
      analytics.trackAppClose();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cleanupErrorTracking();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return <>{children}</>;
}
