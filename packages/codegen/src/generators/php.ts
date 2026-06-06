import type { CodeGenerator, RequestDefinition } from "../types";
import { getAllHeaders, buildFullUrl } from "../utils/formatting";

export const phpGenerator: CodeGenerator = {
  id: "php",
  name: "PHP - cURL",
  language: "php",

  generate(request: RequestDefinition): string {
    const url = buildFullUrl(request);
    const headers = getAllHeaders(request);
    const lines: string[] = [];

    lines.push(`<?php`);
    lines.push(``);
    lines.push(`$ch = curl_init();`);
    lines.push(``);
    lines.push(`curl_setopt($ch, CURLOPT_URL, "${url}");`);
    lines.push(`curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);`);

    if (request.method !== "GET") {
      lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${request.method}");`);
    }

    // Headers
    const headerEntries = Object.entries(headers);
    const bodyContentType = getContentType(request);
    if (bodyContentType && !headers["Content-Type"]) {
      headerEntries.push(["Content-Type", bodyContentType]);
    }

    if (headerEntries.length > 0) {
      lines.push(`curl_setopt($ch, CURLOPT_HTTPHEADER, [`);
      for (const [key, value] of headerEntries) {
        lines.push(`    "${key}: ${value}",`);
      }
      lines.push(`]);`);
    }

    // Body
    switch (request.body.type) {
      case "json": {
        const escaped = request.body.content.replace(/'/g, "\\'");
        lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${escaped}');`);
        break;
      }
      case "raw": {
        const escaped = request.body.content.replace(/'/g, "\\'");
        lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${escaped}');`);
        break;
      }
      case "form-urlencoded": {
        const pairs = request.body.pairs.filter(p => p.enabled && p.key);
        const encoded = pairs.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join("&");
        lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, "${encoded}");`);
        break;
      }
      case "form-data": {
        const pairs = request.body.pairs.filter(p => p.enabled && p.key);
        lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, [`);
        for (const p of pairs) {
          lines.push(`    "${p.key}" => "${p.value}",`);
        }
        lines.push(`]);`);
        break;
      }
    }

    lines.push(``);
    lines.push(`$response = curl_exec($ch);`);
    lines.push(`curl_close($ch);`);
    lines.push(``);
    lines.push(`echo $response;`);

    return lines.join("\n");
  },
};

function getContentType(request: RequestDefinition): string | null {
  switch (request.body.type) {
    case "json": return "application/json";
    case "form-urlencoded": return "application/x-www-form-urlencoded";
    default: return null;
  }
}
