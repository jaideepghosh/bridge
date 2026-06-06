import type { CodeGenerator, RequestDefinition } from "../types";
import { getAllHeaders, buildFullUrl } from "../utils/formatting";

export const nodeFetchGenerator: CodeGenerator = {
  id: "node-fetch",
  name: "Node.js - Fetch",
  language: "javascript",

  generate(request: RequestDefinition): string {
    const url = buildFullUrl(request);
    const headers = getAllHeaders(request);
    const lines: string[] = [];

    const options: string[] = [];

    options.push(`  method: "${request.method}"`);

    // Headers
    const headerEntries = Object.entries(headers);
    const bodyContentType = getContentType(request);
    if (bodyContentType && !headers["Content-Type"]) {
      headerEntries.push(["Content-Type", bodyContentType]);
    }

    if (headerEntries.length > 0) {
      const headerLines = headerEntries.map(([k, v]) => `    "${k}": "${v}"`).join(",\n");
      options.push(`  headers: {\n${headerLines}\n  }`);
    }

    // Body
    const body = getBodyString(request);
    if (body) {
      options.push(`  body: ${body}`);
    }

    lines.push(`const response = await fetch("${url}", {`);
    lines.push(options.join(",\n"));
    lines.push(`});`);
    lines.push(``);
    lines.push(`const data = await response.json();`);
    lines.push(`console.log(data);`);

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

function getBodyString(request: RequestDefinition): string | null {
  switch (request.body.type) {
    case "none":
      return null;
    case "json":
      return `JSON.stringify(${request.body.content})`;
    case "raw":
      return `"${request.body.content.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
    case "form-urlencoded": {
      const pairs = request.body.pairs.filter(p => p.enabled && p.key);
      const entries = pairs.map(p => `  ["${p.key}", "${p.value}"]`).join(",\n");
      return `new URLSearchParams([\n${entries}\n])`;
    }
    case "form-data": {
      const pairs = request.body.pairs.filter(p => p.enabled && p.key);
      const lines = [`  const formData = new FormData();`];
      for (const p of pairs) {
        lines.push(`  formData.append("${p.key}", "${p.value}");`);
      }
      return `(() => {\n${lines.join("\n")}\n  return formData;\n})()`;
    }
  }
}
