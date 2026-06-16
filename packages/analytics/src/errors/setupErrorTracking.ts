import { analytics } from "../client";

/**
 * Sets up global error tracking by attaching handlers for uncaught
 * errors and unhandled promise rejections.
 *
 * Captured events:
 * - `frontend_error`: From `window.onerror`
 * - `unhandled_rejection`: From `window.onunhandledrejection`
 *
 * Each event includes only:
 * - `message`: The error message string
 * - `stack`: The stack trace (if available)
 *
 * No sensitive application data is captured.
 *
 * @returns A cleanup function that removes the event handlers.
 *
 * @example
 * ```ts
 * // In your app's entry point:
 * import { setupErrorTracking } from "@bridge/analytics";
 *
 * const cleanup = setupErrorTracking();
 *
 * // To remove handlers (e.g., in React useEffect cleanup):
 * cleanup();
 * ```
 */
export function setupErrorTracking(): () => void {
  if (typeof window === "undefined") {
    // Non-browser environment (e.g., SSR) — no-op
    return () => {};
  }

  function handleError(event: ErrorEvent): void {
    analytics.track("frontend_error", {
      message: event.message || "Unknown error",
      stack: event.error?.stack || null,
    });
  }

  function handleRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason;
    let message = "Unknown rejection";
    let stack: string | null = null;

    if (reason instanceof Error) {
      message = reason.message;
      stack = reason.stack || null;
    } else if (typeof reason === "string") {
      message = reason;
    }

    analytics.track("unhandled_rejection", {
      message,
      stack,
    });
  }

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
  };
}
