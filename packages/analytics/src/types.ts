/**
 * Which application is initializing analytics.
 */
export type AppType = "web" | "desktop";

/**
 * Configuration required to initialize the analytics client.
 */
export interface AnalyticsConfig {
  /** PostHog project API key (public, safe to embed in client code). */
  apiKey: string;
  /** PostHog host URL (e.g., "https://eu.i.posthog.com"). */
  host: string;
  /** Which app is initializing analytics. */
  app: AppType;
  /** Application version string. Defaults to "unknown" if not provided. */
  appVersion?: string;
  /** Enable debug mode for verbose logging. Defaults to false. */
  debug?: boolean;
}

/**
 * Super properties that are automatically attached to every event.
 */
export interface SuperProperties {
  app: AppType;
  appVersion: string;
  [key: string]: unknown;
}

/**
 * Metadata for request error tracking.
 *
 * This type is intentionally restrictive to prevent accidental capture of
 * sensitive data. The following are NEVER captured:
 *
 * - Request URL
 * - Request/response headers
 * - Authorization tokens or API keys
 * - Request body
 * - Response body
 * - User-generated content
 *
 * Only operational metadata is allowed.
 */
export interface RequestErrorMetadata {
  /** HTTP status code (e.g., 500, 404). */
  statusCode: number;
  /** HTTP method (e.g., "GET", "POST"). Optional. */
  method?: string;
  /** Request duration in milliseconds. Optional. */
  duration?: number;
}

/**
 * The public analytics client interface.
 *
 * This interface is provider-agnostic — the underlying analytics provider
 * (currently PostHog) can be swapped out by implementing this interface
 * with a different provider.
 */
export interface AnalyticsClient {
  /** Initialize the analytics client. Must be called before any other method. */
  init(config: AnalyticsConfig): void;

  /** Track a named event with optional properties. */
  track(event: string, properties?: Record<string, unknown>): void;

  /** Identify a user with a distinct ID and optional properties. */
  identify(distinctId: string, properties?: Record<string, unknown>): void;

  /** Reset the current user identity (e.g., on logout). */
  reset(): void;

  /** Register super properties that are sent with every subsequent event. */
  register(properties: Record<string, unknown>): void;

  /**
   * Track a request error with sanitized metadata.
   * Never captures URLs, headers, tokens, or request/response bodies.
   */
  trackRequestError(metadata: RequestErrorMetadata): void;

  /** Track an app launch event. Intended for Tauri lifecycle hooks. */
  trackAppLaunch(): void;

  /** Track an app close event. Intended for Tauri lifecycle hooks. */
  trackAppClose(): void;

  /** Check whether the client has been initialized. */
  isInitialized(): boolean;
}
