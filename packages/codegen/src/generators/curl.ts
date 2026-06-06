import type { CodeGenerator, RequestDefinition } from "../types";
import { getAllHeaders, buildFullUrl, escapeString } from "../utils/formatting";

export const curlGenerator: CodeGenerator = {
  id: "curl",
  name: "cURL",
  language: "shell",

  generate(request: RequestDefinition): string {
    const parts: string[] = ["curl"];

    // Method
    if (request.method !== "GET") {
      parts.push(`-X ${request.method}`);
    }

    // URL
    const url = buildFullUrl(request);
    parts.push(`'${escapeString(url, "single")}'`);

    // Headers
    const headers = getAllHeaders(request);
    for (const [key, value] of Object.entries(headers)) {
      parts.push(`-H '${escapeString(key, "single")}: ${escapeString(value, "single")}'`);
    }

    // Body
    switch (request.body.type) {
      case "json":
        if (!headers["Content-Type"]) {
          parts.push(`-H 'Content-Type: application/json'`);
        }
        parts.push(`-d '${escapeString(request.body.content, "single")}'`);
        break;
      case "raw":
        parts.push(`-d '${escapeString(request.body.content, "single")}'`);
        break;
      case "form-urlencoded": {
        if (!headers["Content-Type"]) {
          parts.push(`-H 'Content-Type: application/x-www-form-urlencoded'`);
        }
        const pairs = request.body.pairs.filter(p => p.enabled && p.key);
        for (const p of pairs) {
          parts.push(`--data-urlencode '${escapeString(p.key, "single")}=${escapeString(p.value, "single")}'`);
        }
        break;
      }
      case "form-data": {
        const pairs = request.body.pairs.filter(p => p.enabled && p.key);
        for (const p of pairs) {
          parts.push(`-F '${escapeString(p.key, "single")}=${escapeString(p.value, "single")}'`);
        }
        break;
      }
    }

    return parts.join(" \\\n  ");
  },
};
