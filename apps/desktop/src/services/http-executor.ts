import { invoke, Channel } from "@tauri-apps/api/core";
import type {
  ProxyRequestInput,
  ProxyResponse,
  ExecuteRequestOptions,
} from "@bridge/components";

function isTextLike(contentType?: string): boolean {
  if (!contentType) return true;
  const ct = contentType.toLowerCase();
  return (
    ct.includes("text/") ||
    ct.includes("json") ||
    ct.includes("xml") ||
    ct.includes("javascript") ||
    ct.includes("html")
  );
}

export async function tauriHttpExecutor(
  req: ProxyRequestInput,
  options?: ExecuteRequestOptions,
): Promise<ProxyResponse> {
  const isTauri =
    typeof window !== "undefined" &&
    (window as any).__TAURI_IPC__ !== undefined;

  if (isTauri) {
    const channel = new Channel<any>();
    channel.onmessage = (event: any) => {
      if (event.type === "headers") {
        if (options?.onHeaders) {
          options.onHeaders(event.status, event.status_text, event.headers);
        }
      } else if (event.type === "chunk") {
        if (options?.onChunk) {
          options.onChunk(event.value);
        }
      }
    };

    // If options.signal is aborted, we want to handle it on the JS side by discarding
    // or dropping. Since Rust is executing it, if signal aborts, we don't block.
    return invoke<ProxyResponse>("execute_request_stream", {
      req,
      channel,
    });
  }

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 30000);

  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener("abort", () => {
        controller.abort();
      });
    }
  }

  try {
    const response = await window.fetch(req.url, {
      method: req.method,
      headers: req.headers ?? {},
      body: req.body ?? undefined,
      signal: controller.signal,
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    if (options?.onHeaders) {
      options.onHeaders(response.status, response.statusText, responseHeaders);
    }

    let body = "";
    const contentType = response.headers.get("content-type") ?? undefined;
    const isText = isTextLike(contentType);

    if (
      isText &&
      response.body &&
      typeof response.body.getReader === "function"
    ) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        body += chunk;
        if (options?.onChunk) {
          options.onChunk(chunk);
        }
      }
      const remaining = decoder.decode();
      if (remaining) {
        body += remaining;
        if (options?.onChunk) {
          options.onChunk(remaining);
        }
      }
    } else {
      body = await response.text();
      if (options?.onChunk && body) {
        options.onChunk(body);
      }
    }

    const durationMs = Date.now() - start;
    const size = new TextEncoder().encode(body).length;

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
