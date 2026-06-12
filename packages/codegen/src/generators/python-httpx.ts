import type { CodeGenerator, RequestDefinition } from "../types";
import {
  getAllHeaders,
  getEnabledParams,
  getAuthQueryParams,
} from "../utils/formatting";

export const pythonHttpxGenerator: CodeGenerator = {
  id: "python-httpx",
  name: "Python - HTTPX",
  language: "python",

  generate(request: RequestDefinition): string {
    const headers = getAllHeaders(request);
    const params = [
      ...getEnabledParams(request),
      ...getAuthQueryParams(request.auth),
    ];
    const lines: string[] = [];

    lines.push(`import httpx`);
    lines.push(``);

    // URL
    lines.push(`url = "${request.url}"`);

    // Query params
    if (params.length > 0) {
      const paramLines = params
        .map((p) => `    "${p.key}": "${p.value}"`)
        .join(",\n");
      lines.push(`params = {\n${paramLines}\n}`);
    }

    // Headers
    const headerEntries = Object.entries(headers);
    const bodyContentType = getContentType(request);
    if (bodyContentType && !headers["Content-Type"]) {
      headerEntries.push(["Content-Type", bodyContentType]);
    }

    if (headerEntries.length > 0) {
      const headerLines = headerEntries
        .map(([k, v]) => `    "${k}": "${v}"`)
        .join(",\n");
      lines.push(`headers = {\n${headerLines}\n}`);
    }

    // Body
    addBody(request, lines);

    // Request call
    const method = request.method.toLowerCase();
    const args: string[] = [`"${method.toUpperCase()}"`, "url"];
    if (params.length > 0) args.push("params=params");
    if (headerEntries.length > 0) args.push("headers=headers");

    switch (request.body.type) {
      case "json":
        args.push("json=payload");
        break;
      case "raw":
        args.push("content=payload");
        break;
      case "form-urlencoded":
        args.push("data=data");
        break;
      case "form-data":
        args.push("files=files");
        break;
    }

    lines.push(``);
    lines.push(`with httpx.Client() as client:`);
    lines.push(`    response = client.request(${args.join(", ")})`);
    lines.push(`    print(response.json())`);

    return lines.join("\n");
  },
};

function getContentType(request: RequestDefinition): string | null {
  switch (request.body.type) {
    case "json":
      return "application/json";
    case "form-urlencoded":
      return "application/x-www-form-urlencoded";
    default:
      return null;
  }
}

function addBody(request: RequestDefinition, lines: string[]): void {
  switch (request.body.type) {
    case "json": {
      lines.push(`payload = ${request.body.content}`);
      break;
    }
    case "raw": {
      const escaped = request.body.content.replace(/"/g, '\\"');
      lines.push(`payload = "${escaped}"`);
      break;
    }
    case "form-urlencoded": {
      const pairs = request.body.pairs.filter((p) => p.enabled && p.key);
      const entries = pairs
        .map((p) => `    "${p.key}": "${p.value}"`)
        .join(",\n");
      lines.push(`data = {\n${entries}\n}`);
      break;
    }
    case "form-data": {
      const pairs = request.body.pairs.filter((p) => p.enabled && p.key);
      const entries = pairs
        .map((p) => `    ("${p.key}", (None, "${p.value}"))`)
        .join(",\n");
      lines.push(`files = [\n${entries}\n]`);
      break;
    }
  }
}
