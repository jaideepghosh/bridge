import type { ProxyRequestInput, ProxyResponse } from "@bridge/components";

export async function webProxyExecutor(req: ProxyRequestInput): Promise<ProxyResponse> {
  const res = await fetch("/api/proxy/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Proxy request failed");
  }
  return res.json();
}
