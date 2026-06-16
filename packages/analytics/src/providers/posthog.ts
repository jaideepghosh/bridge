import posthog from "posthog-js";
import type { AnalyticsClient, AnalyticsConfig, RequestErrorMetadata } from "../types";
import { AnalyticsEvent } from "../events";

/**
 * Creates an analytics client backed by PostHog.
 *
 * This is the only file that imports `posthog-js` directly.
 * To swap providers, create a new factory function implementing
 * the same `AnalyticsClient` interface.
 */
export function createPostHogClient(): AnalyticsClient {
  let initialized = false;

  function guardInitialized(method: string): boolean {
    if (!initialized) {
      console.warn(
        `[analytics] ${method}() called before init(). Call analytics.init() first.`
      );
      return false;
    }
    return true;
  }

  const client: AnalyticsClient = {
    init(config: AnalyticsConfig): void {
      if (initialized) {
        console.warn("[analytics] Already initialized. Ignoring duplicate init() call.");
        return;
      }

      const isDesktop = config.app === "desktop";

      posthog.init(config.apiKey, {
        api_host: config.host,
        defaults: "2026-01-30",

        // PostHog autocapture — we rely on this heavily
        autocapture: true,

        // Web apps: let PostHog handle pageviews. Desktop apps: no pageviews.
        capture_pageview: !isDesktop,
        capture_pageleave: !isDesktop,

        // Disable PostHog session recording unless explicitly enabled
        disable_session_recording: true,

        // Debug mode for development
        ...(config.debug ? { debug: true } : {}),
      });

      // Register super properties that are sent with every event
      posthog.register({
        app: config.app,
        appVersion: config.appVersion ?? "unknown",
      });

      initialized = true;
    },

    track(event: string, properties?: Record<string, unknown>): void {
      if (!guardInitialized("track")) return;
      posthog.capture(event, properties);
    },

    identify(distinctId: string, properties?: Record<string, unknown>): void {
      if (!guardInitialized("identify")) return;
      posthog.identify(distinctId, properties);
    },

    reset(): void {
      if (!guardInitialized("reset")) return;
      posthog.reset();
    },

    register(properties: Record<string, unknown>): void {
      if (!guardInitialized("register")) return;
      posthog.register(properties);
    },

    trackRequestError(metadata: RequestErrorMetadata): void {
      if (!guardInitialized("trackRequestError")) return;

      // Only capture operational metadata — never URLs, headers, tokens, or bodies
      posthog.capture(AnalyticsEvent.REQUEST_ERROR, {
        statusCode: metadata.statusCode,
        ...(metadata.method !== undefined ? { method: metadata.method } : {}),
        ...(metadata.duration !== undefined ? { duration: metadata.duration } : {}),
      });
    },

    trackAppLaunch(): void {
      if (!guardInitialized("trackAppLaunch")) return;
      posthog.capture(AnalyticsEvent.APP_LAUNCHED);
    },

    trackAppClose(): void {
      if (!guardInitialized("trackAppClose")) return;
      posthog.capture(AnalyticsEvent.APP_CLOSED);
    },

    isInitialized(): boolean {
      return initialized;
    },
  };

  return client;
}
