import type { RequestDefinition, KeyValuePair, AuthConfig } from "../types";

export function getEnabledHeaders(
  request: RequestDefinition,
): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const h of request.headers) {
    if (h.enabled && h.key) {
      headers[h.key] = h.value;
    }
  }
  return headers;
}

export function getEnabledParams(request: RequestDefinition): KeyValuePair[] {
  return request.queryParams.filter((p: KeyValuePair) => p.enabled && p.key);
}

export function buildUrl(request: RequestDefinition): string {
  const params = getEnabledParams(request);
  if (params.length === 0) return request.url;

  const separator = request.url.includes("?") ? "&" : "?";
  const qs = params
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
  return `${request.url}${separator}${qs}`;
}

export function getAuthHeaders(auth: AuthConfig): Record<string, string> {
  switch (auth.type) {
    case "bearer":
      return { Authorization: `Bearer ${auth.token}` };
    case "basic": {
      const encoded = btoa(`${auth.username}:${auth.password}`);
      return { Authorization: `Basic ${encoded}` };
    }
    case "apiKey":
      if (auth.in === "header") {
        return { [auth.key]: auth.value };
      }
      return {};
    default:
      return {};
  }
}

export function getAuthQueryParams(auth: AuthConfig): KeyValuePair[] {
  if (auth.type === "apiKey" && auth.in === "query") {
    return [{ id: "", key: auth.key, value: auth.value, enabled: true }];
  }
  return [];
}

export function buildFullUrl(request: RequestDefinition): string {
  const params = [
    ...getEnabledParams(request),
    ...getAuthQueryParams(request.auth),
  ];
  if (params.length === 0) return request.url;

  const separator = request.url.includes("?") ? "&" : "?";
  const qs = params
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
  return `${request.url}${separator}${qs}`;
}

export function getAllHeaders(
  request: RequestDefinition,
): Record<string, string> {
  return { ...getEnabledHeaders(request), ...getAuthHeaders(request.auth) };
}

export function escapeString(
  str: string,
  quote: "single" | "double" = "double",
): string {
  if (quote === "single") {
    return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function getBodyContent(request: RequestDefinition): {
  contentType?: string;
  body: string | null;
} {
  switch (request.body.type) {
    case "none":
      return { body: null };
    case "json":
      return { contentType: "application/json", body: request.body.content };
    case "raw":
      return { body: request.body.content };
    case "form-urlencoded": {
      const pairs = request.body.pairs.filter(
        (p: KeyValuePair) => p.enabled && p.key,
      );
      const encoded = pairs
        .map(
          (p: KeyValuePair) =>
            `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
        )
        .join("&");
      return {
        contentType: "application/x-www-form-urlencoded",
        body: encoded,
      };
    }
    case "form-data": {
      const pairs = request.body.pairs.filter(
        (p: KeyValuePair) => p.enabled && p.key,
      );
      return {
        contentType: "multipart/form-data",
        body: JSON.stringify(pairs),
      };
    }
  }
}

export function indent(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((line) => (line.trim() ? pad + line : line))
    .join("\n");
}
