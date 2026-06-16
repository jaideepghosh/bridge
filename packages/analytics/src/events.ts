/**
 * Strongly-typed analytics event constants.
 *
 * Only a minimal set of custom events are defined here.
 * PostHog's autocapture handles clicks, form submissions, and pageviews
 * automatically — we only add events for app lifecycle and errors.
 */
export const AnalyticsEvent = {
  /** Fired when the application starts. */
  APP_LAUNCHED: "app_launched",
  /** Fired when the application is closing. */
  APP_CLOSED: "app_closed",
  /** Fired when an HTTP request fails. */
  REQUEST_ERROR: "request_error",
  /** Fired when an unrecoverable error crashes the app. */
  APP_CRASH: "app_crash",
} as const;

/**
 * Union type of all analytics event name values.
 */
export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];
