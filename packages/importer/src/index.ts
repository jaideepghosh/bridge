import { ImportResult } from "./types";
import { parseCurl } from "./parsers/curl";
import { parsePostman } from "./parsers/postman";
import { parseOpenApi } from "./parsers/openapi";
import { parse as parseYaml } from "yaml";

export * from "./types";
export * from "./exporters";

export function parseImportContent(input: string): ImportResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Detect cURL command
  if (trimmed.toLowerCase().startsWith("curl")) {
    const req = parseCurl(trimmed);
    if (req) return { type: "request", data: req };
  }

  // 2. Detect JSON formats
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsedJson = JSON.parse(trimmed);

      // Check if Bridge Collection
      if (parsedJson && parsedJson.type === "collection" && Array.isArray(parsedJson.folders) && Array.isArray(parsedJson.requests)) {
        return { type: "collection", data: parsedJson };
      }

      // Check if Bridge Request
      if (parsedJson && parsedJson.type === "request" && parsedJson.method && parsedJson.url) {
        return { type: "request", data: parsedJson };
      }

      // Check if Postman
      if (parsedJson && parsedJson.info && Array.isArray(parsedJson.item)) {
        const col = parsePostman(parsedJson);
        if (col) return { type: "collection", data: col };
      }

      // Check if OpenAPI / Swagger JSON
      if (parsedJson && (parsedJson.openapi || parsedJson.swagger)) {
        const col = parseOpenApi(trimmed);
        if (col) return { type: "collection", data: col };
      }
    } catch {
      // Fall through to other parsers
    }
  }

  // 3. Detect YAML / OpenAPI YAML
  try {
    const parsedYaml = parseYaml(trimmed);
    if (parsedYaml && typeof parsedYaml === "object" && (parsedYaml.openapi || parsedYaml.swagger)) {
      const col = parseOpenApi(trimmed);
      if (col) return { type: "collection", data: col };
    }
  } catch {
    // Parsing error, continue
  }

  // 4. Final fallback check: try to parse with OpenAPI parser directly
  try {
    const col = parseOpenApi(trimmed);
    if (col) return { type: "collection", data: col };
  } catch {
    // Silent fail
  }

  return null;
}

