import { HttpMethod, KeyValuePair, RequestBody, AuthConfig } from "@/types";
import { v4 as uuidv4 } from "uuid";

export type ParsedCurl = {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
};

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    while (i < input.length && /\s/.test(input[i] ?? "")) i++;
    if (i >= input.length) break;
    const char = input[i] ?? "";
    if (char === "'" || char === '"') {
      const quote = char;
      i++;
      let str = "";
      while (i < input.length && (input[i] ?? "") !== quote) {
        const nextChar = input[i] ?? "";
        if (nextChar === "\\" && i + 1 < input.length) {
          i++;
          str += input[i] ?? "";
        } else {
          str += nextChar;
        }
        i++;
      }
      i++;
      tokens.push(str);
    } else if (char === "$" && (input[i + 1] ?? "") === "'") {
      i += 2;
      let str = "";
      while (i < input.length && (input[i] ?? "") !== "'") {
        const nextChar = input[i] ?? "";
        if (nextChar === "\\" && i + 1 < input.length) {
          i++;
          const esc: Record<string, string> = {
            n: "\n",
            t: "\t",
            r: "\r",
            "\\": "\\",
          };
          str += esc[input[i] ?? ""] ?? input[i] ?? "";
        } else {
          str += nextChar;
        }
        i++;
      }
      i++;
      tokens.push(str);
    } else {
      let token = "";
      while (i < input.length && !/\s/.test(input[i] ?? "")) {
        token += input[i++] ?? "";
      }
      tokens.push(token);
    }
  }
  return tokens;
}

function parseUrl(raw: string): {
  baseUrl: string;
  queryParams: KeyValuePair[];
} {
  try {
    const url = new URL(raw);
    const queryParams: KeyValuePair[] = [];
    url.searchParams.forEach((value, key) => {
      queryParams.push({ id: uuidv4(), key, value, enabled: true });
    });
    url.search = "";
    return { baseUrl: url.toString(), queryParams };
  } catch {
    const qIdx = raw.indexOf("?");
    if (qIdx === -1) return { baseUrl: raw, queryParams: [] };
    const qs = raw.slice(qIdx + 1);
    const queryParams: KeyValuePair[] = qs.split("&").map((pair) => {
      const [k, v] = pair.split("=");
      return {
        id: uuidv4(),
        key: decodeURIComponent(k || ""),
        value: decodeURIComponent(v || ""),
        enabled: true,
      };
    });
    return { baseUrl: raw.slice(0, qIdx), queryParams };
  }
}

export function parseCurl(input: string): ParsedCurl | null {
  const cleaned = input
    .trim()
    .replace(/\\\n/g, " ")
    .replace(/\\\r\n/g, " ");
  const tokens = tokenize(cleaned);

  if (!tokens.length || tokens[0]?.toLowerCase() !== "curl") return null;

  let method: HttpMethod | null = null;
  let rawUrl = "";
  const headers: KeyValuePair[] = [];
  let bodyStr: string | null = null;
  let username = "";
  let password = "";

  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === undefined) continue;

    if (tok === "-X" || tok === "--request") {
      method = (tokens[++i]?.toUpperCase() as HttpMethod) || "GET";
    } else if (tok === "-H" || tok === "--header") {
      const hdr = tokens[++i] || "";
      const colonIdx = hdr.indexOf(":");
      if (colonIdx !== -1) {
        headers.push({
          id: uuidv4(),
          key: hdr.slice(0, colonIdx).trim(),
          value: hdr.slice(colonIdx + 1).trim(),
          enabled: true,
        });
      }
    } else if (
      tok === "-d" ||
      tok === "--data" ||
      tok === "--data-raw" ||
      tok === "--data-binary"
    ) {
      bodyStr = tokens[++i] || "";
    } else if (tok === "-u" || tok === "--user") {
      const creds = tokens[++i] || "";
      const colonIdx = creds.indexOf(":");
      if (colonIdx !== -1) {
        username = creds.slice(0, colonIdx);
        password = creds.slice(colonIdx + 1);
      } else {
        username = creds;
      }
    } else if (
      tok === "--compressed" ||
      tok === "-s" ||
      tok === "--silent" ||
      tok === "-L" ||
      tok === "--location" ||
      tok === "--insecure" ||
      tok === "-k"
    ) {
      // skip flags
    } else if (
      tok.startsWith("http://") ||
      tok.startsWith("https://") ||
      tok.startsWith("{{")
    ) {
      rawUrl = tok;
    } else if (!tok.startsWith("-") && !rawUrl) {
      rawUrl = tok;
    }
  }

  if (!rawUrl) return null;

  const { baseUrl, queryParams } = parseUrl(rawUrl);

  let body: RequestBody = { type: "none" };
  if (bodyStr !== null) {
    const ctHeader = headers.find(
      (h) => h.key.toLowerCase() === "content-type",
    );
    const ct = ctHeader?.value?.toLowerCase() || "";
    if (
      ct.includes("application/json") ||
      bodyStr.trim().startsWith("{") ||
      bodyStr.trim().startsWith("[")
    ) {
      try {
        JSON.parse(bodyStr);
        body = {
          type: "json",
          content: JSON.stringify(JSON.parse(bodyStr), null, 2),
        };
      } catch {
        body = { type: "raw", content: bodyStr };
      }
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const pairs: KeyValuePair[] = bodyStr.split("&").map((pair) => {
        const [k, v] = pair.split("=");
        return {
          id: uuidv4(),
          key: decodeURIComponent(k || ""),
          value: decodeURIComponent(v || ""),
          enabled: true,
        };
      });
      body = { type: "form-urlencoded", pairs };
    } else {
      body = { type: "raw", content: bodyStr };
    }
  }

  if (!method) {
    method = bodyStr !== null ? "POST" : "GET";
  }

  let auth: AuthConfig = { type: "none" };
  if (username) {
    auth = { type: "basic", username, password };
  } else {
    const authHeader = headers.find(
      (h) => h.key.toLowerCase() === "authorization",
    );
    if (authHeader) {
      const val = authHeader.value;
      if (val.toLowerCase().startsWith("bearer ")) {
        auth = { type: "bearer", token: val.slice(7).trim() };
        headers.splice(headers.indexOf(authHeader), 1);
      } else if (val.toLowerCase().startsWith("basic ")) {
        try {
          const decoded = atob(val.slice(6).trim());
          const ci = decoded.indexOf(":");
          auth = {
            type: "basic",
            username: decoded.slice(0, ci),
            password: decoded.slice(ci + 1),
          };
          headers.splice(headers.indexOf(authHeader), 1);
        } catch {
          // keep as header
        }
      }
    }
  }

  return { method, url: baseUrl, headers, queryParams, body, auth };
}
