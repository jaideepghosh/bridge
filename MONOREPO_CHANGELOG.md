# Bridge Monorepo Changelog

This file is maintained by the `bridge-monorepo-dev` skill. Every session that creates or
modifies code appends an entry here. Read this at the start of each session to understand
what was built and why.

---

- **Streaming Response & Request Cancellation (2026-06-12)**
  - Added support for chunked progressive response streaming in both desktop (Tauri/Rust Backend) and web apps (Next.js Proxy).
  - Implemented a custom Tauri command `execute_request_stream` in Rust and frontend `Channel` integration in the desktop app to bypass `tauri-plugin-http`'s blocking/buffering limitation.
  - Modified Next.js `/api/proxy/execute` proxy route to transparently stream response bodies using `NextResponse` instead of buffering.
  - Added non-buffering and keep-alive headers (`X-Accel-Buffering: no`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`) to avoid intermediate compression or proxy buffering.
  - Added user-initiated request cancellation support. The Send button becomes a Cancel button when executing, aborting the underlying HTTP request.
  - Updated the response viewer UI to render content progressively and show a pulsing, animated "Streaming" badge during active streams.

<!-- New entries go ABOVE this line, newest first -->
