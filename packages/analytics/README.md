# @bridge/analytics

A lightweight, privacy-first analytics package for Bridge. Provides a thin abstraction over [PostHog](https://posthog.com/) that is reusable across both the Next.js web app and the Tauri desktop app.

## Quick Start

### 1. Initialize

```ts
import { analytics } from "@bridge/analytics";

analytics.init({
  apiKey: "phc_...",
  host: "https://eu.i.posthog.com",
  app: "web", // or "desktop"
  appVersion: "0.2.0",
});
```

### 2. Track Events

```ts
import { analytics, AnalyticsEvent } from "@bridge/analytics";

analytics.track(AnalyticsEvent.APP_LAUNCHED);
analytics.track(AnalyticsEvent.APP_CLOSED);
```

### 3. Identify Users

```ts
analytics.identify("user-123", { plan: "pro" });
```

### 4. Reset (Logout)

```ts
analytics.reset();
```

---

## Event Constants

Only a minimal set of custom events are defined. PostHog's autocapture handles the rest.

| Constant | Value | Description |
|---|---|---|
| `APP_LAUNCHED` | `"app_launched"` | App started |
| `APP_CLOSED` | `"app_closed"` | App closing |
| `REQUEST_ERROR` | `"request_error"` | HTTP request failed |
| `APP_CRASH` | `"app_crash"` | Unrecoverable error |

```ts
import { AnalyticsEvent } from "@bridge/analytics";

analytics.track(AnalyticsEvent.APP_LAUNCHED);
```

---

## Error Tracking

Automatically captures `window.onerror` and `unhandledrejection` events:

```ts
import { setupErrorTracking } from "@bridge/analytics";

// In your app entry point
const cleanup = setupErrorTracking();

// In React useEffect cleanup
cleanup();
```

This captures two event types:

| Event | Source | Properties |
|---|---|---|
| `frontend_error` | `window.onerror` | `message`, `stack` |
| `unhandled_rejection` | `unhandledrejection` | `message`, `stack` |

Only error message and stack trace are captured — no sensitive data.

---

## Request Error Tracking

Track HTTP request failures with sanitized metadata:

```ts
analytics.trackRequestError({
  statusCode: 500,
  method: "POST",
  duration: 1234,
});
```

### What is captured

- `statusCode` — HTTP status code
- `method` — HTTP method (optional)
- `duration` — Request duration in ms (optional)

### What is NEVER captured

- ❌ Request URL
- ❌ Request/response headers
- ❌ Authorization tokens or API keys
- ❌ Request body
- ❌ Response body
- ❌ User-generated content

---

## Super Properties

Register properties that are sent with every subsequent event:

```ts
// Automatically registered on init:
// { app: "web" | "desktop", appVersion: "0.2.0" }

// Add more later:
analytics.register({
  workspaceId: "ws-123",
});
```

---

## Client Segmentation (Web vs Desktop)

### Why the `app` property exists

Bridge ships as both a **Next.js web app** and a **Tauri desktop app**. To understand usage patterns across clients, every event is automatically tagged with:

```ts
app: "web" | "desktop"
```

This is set once during `analytics.init()` and attached to **every subsequent event** via PostHog's `register()` mechanism. Callers never need to pass it manually.

### How it works

```ts
// Next.js web app
analytics.init({ apiKey: "...", host: "...", app: "web" });

// Tauri desktop app
analytics.init({ apiKey: "...", host: "...", app: "desktop" });
```

The `app` field is strongly typed:

```ts
type AppType = "web" | "desktop";
```

Every event payload automatically includes the property:

```json
{
  "event": "app_launched",
  "properties": {
    "app": "desktop",
    "appVersion": "0.2.0"
  }
}
```

### PostHog usage examples

#### Breakdown events by client

1. Create an Insight → **Trends**
2. Select event: `app_launched`
3. Click **Breakdown** → select property `app`
4. Expected result:

```text
web      62%
desktop  38%
```

#### Filter events by client

- Filter where `app = desktop` to see desktop-only events
- Filter where `app = web` to see web-only events

#### Create cohorts

- **Web-only users**: Users where `app = web` (all time)
- **Desktop-only users**: Users where `app = desktop` (all time)
- **Cross-platform users**: Users who have both `app = web` AND `app = desktop`

#### Build comparison dashboards

Create a dashboard with side-by-side insights:
- `app_launched` count, broken down by `app`
- `request_error` rate, broken down by `app`
- `frontend_error` count, broken down by `app`

### Design constraints

- **Single event stream** — we use one `app_launched` event with the `app` property, not separate `web_app_launched` / `desktop_app_launched` events
- **Automatic** — the property is registered once during init, no manual passing required
- **Provider-agnostic** — uses PostHog's built-in `register()` for super properties

---

## React Hook

```tsx
import { useAnalytics } from "@bridge/analytics";

function MyComponent() {
  const analytics = useAnalytics();

  return (
    <button onClick={() => analytics.track("button_clicked")}>
      Click me
    </button>
  );
}
```

---

## Tauri Lifecycle

Wire into Tauri lifecycle events:

```ts
import { analytics } from "@bridge/analytics";

// On app start
analytics.trackAppLaunch();

// On app close (e.g., in beforeunload or Tauri close event)
analytics.trackAppClose();
```

---

## PostHog Default Features

This package **relies on PostHog's built-in capabilities** and does NOT reimplement:

| Feature | Handled By |
|---|---|
| Browser detection | PostHog autocapture |
| OS detection | PostHog autocapture |
| Location detection | PostHog GeoIP |
| Session duration | PostHog sessions |
| Session counting | PostHog sessions |
| Pageview tracking | PostHog autocapture (web only) |
| Click tracking | PostHog autocapture |
| Form submission tracking | PostHog autocapture |

We only add custom events for app lifecycle (`APP_LAUNCHED`, `APP_CLOSED`) and error tracking (`REQUEST_ERROR`, `APP_CRASH`, `frontend_error`, `unhandled_rejection`).

---

## Privacy

This package follows a **privacy-first** approach. Analytics only contain operational metadata:

### Captured

- ✅ Event names
- ✅ HTTP status codes
- ✅ HTTP methods
- ✅ Request durations
- ✅ Error messages and stack traces
- ✅ App type and version

### Never Captured

- ❌ Request URLs
- ❌ Request/response payloads
- ❌ Authorization headers
- ❌ API keys or secrets
- ❌ User-generated content

---

## Architecture

```
@bridge/analytics
├── src/
│   ├── client.ts           # Singleton analytics client
│   ├── events.ts           # Event name constants
│   ├── types.ts            # TypeScript interfaces
│   ├── providers/
│   │   └── posthog.ts      # PostHog implementation (only file importing posthog-js)
│   ├── hooks/
│   │   └── useAnalytics.ts # React hook
│   ├── errors/
│   │   └── setupErrorTracking.ts  # Global error handlers
│   └── index.ts            # Barrel export
```

The package is **provider-agnostic by design**. The `AnalyticsClient` interface is defined in `types.ts`, and the PostHog implementation is isolated in `providers/posthog.ts`. To swap providers, create a new factory function implementing the same interface and update `client.ts`.
