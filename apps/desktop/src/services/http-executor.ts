import { fetch } from "@tauri-apps/plugin-http";
import type { ProxyRequestInput, ProxyResponse } from "@payable-turborepo-starter/components";

export async function tauriHttpExecutor(req: ProxyRequestInput): Promise<ProxyResponse> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 30000);

  try {
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_IPC__ !== undefined;
    const actualFetch = isTauri ? fetch : window.fetch;

    const response = await actualFetch(req.url, {
      method: req.method,
      headers: req.headers ?? {},
      body: req.body ?? undefined,
      signal: controller.signal,
    });

    const durationMs = Date.now() - start;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    const body = await response.text();
    const size = new TextEncoder().encode(body).length;
    const contentType = response.headers.get("content-type") ?? undefined;

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body,
      durationMs,
      size,
      contentType,
    };
  } finally {
    clearTimeout(timer);
  }
}
