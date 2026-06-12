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

export async function webProxyExecutor(
  req: ProxyRequestInput,
  options?: ExecuteRequestOptions,
): Promise<ProxyResponse> {
  const start = Date.now();
  const res = await fetch("/api/proxy/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal: options?.signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.details ?? err.error ?? "Proxy request failed");
  }

  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  if (options?.onHeaders) {
    options.onHeaders(res.status, res.statusText, responseHeaders);
  }

  let body = "";
  const contentType = res.headers.get("content-type") ?? undefined;
  const isText = isTextLike(contentType);

  if (isText && res.body && typeof res.body.getReader === "function") {
    const reader = res.body.getReader();
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
    body = await res.text();
    if (options?.onChunk && body) {
      options.onChunk(body);
    }
  }

  const durationMs = Date.now() - start;
  const size = new TextEncoder().encode(body).length;

  return {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
    body,
    durationMs,
    size,
    contentType,
  };
}
