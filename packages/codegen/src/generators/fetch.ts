import type { CodeGenerator, RequestDefinition } from "../types";
import { getAllHeaders, buildFullUrl } from "../utils/formatting";

export const fetchGenerator: CodeGenerator = {
  id: "javascript-fetch",
  name: "JavaScript - Fetch",
  language: "javascript",

  generate(request: RequestDefinition): string {
    const url = buildFullUrl(request);
    const headers = getAllHeaders(request);
    const lines: string[] = [];

    const options: string[] = [];

    if (request.method !== "GET") {
      options.push(`  method: "${request.method}"`);
    }

    // Headers
    const headerEntries = Object.entries(headers);
    const bodyContentType = getContentTypeForBody(request);
    if (bodyContentType && !headers["Content-Type"]) {
      headerEntries.push(["Content-Type", bodyContentType]);
    }

    if (headerEntries.length > 0) {
      const headerLines = headerEntries
        .map(([k, v]) => `    "${k}": "${v}"`)
        .join(",\n");
      options.push(`  headers: {\n${headerLines}\n  }`);
    }

    // Body
    const body = getBodyString(request);
    if (body) {
      options.push(`  body: ${body}`);
    }

    if (options.length > 0) {
      lines.push(`fetch("${url}", {`);
      lines.push(options.join(",\n"));
      lines.push(`})`);
    } else {
      lines.push(`fetch("${url}")`);
    }

    lines.push(`  .then(response => response.json())`);
    lines.push(`  .then(data => console.log(data))`);
    lines.push(`  .catch(error => console.error(error));`);

    return lines.join("\n");
  },
};

function getContentTypeForBody(request: RequestDefinition): string | null {
  switch (request.body.type) {
    case "json":
      return "application/json";
    case "form-urlencoded":
      return "application/x-www-form-urlencoded";
    default:
      return null;
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
      const pairs = request.body.pairs.filter((p) => p.enabled && p.key);
      const entries = pairs
        .map((p) => `  ["${p.key}", "${p.value}"]`)
        .join(",\n");
      return `new URLSearchParams([\n${entries}\n])`;
    }
    case "form-data": {
      const pairs = request.body.pairs.filter((p) => p.enabled && p.key);
      const lines = pairs.map(
        (p) => `formData.append("${p.key}", "${p.value}");`,
      );
      return `(() => {\n  const formData = new FormData();\n  ${lines.join("\n  ")}\n  return formData;\n})()`;
    }
  }
}
