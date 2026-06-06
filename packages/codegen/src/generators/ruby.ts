import type { CodeGenerator, RequestDefinition } from "../types";
import { getAllHeaders, getEnabledParams, getAuthQueryParams } from "../utils/formatting";

export const rubyGenerator: CodeGenerator = {
  id: "ruby",
  name: "Ruby - Net::HTTP",
  language: "ruby",

  generate(request: RequestDefinition): string {
    const headers = getAllHeaders(request);
    const params = [...getEnabledParams(request), ...getAuthQueryParams(request.auth)];
    const lines: string[] = [];

    lines.push(`require "net/http"`);
    lines.push(`require "uri"`);
    lines.push(`require "json"`);
    lines.push(``);

    // URL
    let urlExpr: string;
    if (params.length > 0) {
      lines.push(`uri = URI.parse("${request.url}")`);
      const paramEntries = params.map(p => `  "${p.key}" => "${p.value}"`).join(",\n");
      lines.push(`params = {\n${paramEntries}\n}`);
      lines.push(`uri.query = URI.encode_www_form(params)`);
      urlExpr = "uri";
    } else {
      lines.push(`uri = URI.parse("${request.url}")`);
      urlExpr = "uri";
    }

    lines.push(``);
    lines.push(`http = Net::HTTP.new(${urlExpr}.host, ${urlExpr}.port)`);
    lines.push(`http.use_ssl = ${urlExpr}.scheme == "https"`);
    lines.push(``);

    // Request class
    const methodClass = getMethodClass(request.method);
    lines.push(`request = Net::HTTP::${methodClass}.new(${urlExpr})`);

    // Headers
    const bodyContentType = getContentType(request);
    if (bodyContentType && !headers["Content-Type"]) {
      headers["Content-Type"] = bodyContentType;
    }

    for (const [key, value] of Object.entries(headers)) {
      lines.push(`request["${key}"] = "${value}"`);
    }

    // Body
    switch (request.body.type) {
      case "json": {
        lines.push(`request.body = '${request.body.content.replace(/'/g, "\\'")}'`);
        break;
      }
      case "raw": {
        lines.push(`request.body = '${request.body.content.replace(/'/g, "\\'")}'`);
        break;
      }
      case "form-urlencoded": {
        const pairs = request.body.pairs.filter(p => p.enabled && p.key);
        const formEntries = pairs.map(p => `  ["${p.key}", "${p.value}"]`).join(",\n");
        lines.push(`request.set_form_data([\n${formEntries}\n])`);
        break;
      }
      case "form-data": {
        const pairs = request.body.pairs.filter(p => p.enabled && p.key);
        const formEntries = pairs.map(p => `  ["${p.key}", "${p.value}"]`).join(",\n");
        lines.push(`# For multipart, consider using a gem like multipart-post`);
        lines.push(`request.set_form([\n${formEntries}\n], "multipart/form-data")`);
        break;
      }
    }

    lines.push(``);
    lines.push(`response = http.request(request)`);
    lines.push(`puts response.body`);

    return lines.join("\n");
  },
};

function getMethodClass(method: string): string {
  const map: Record<string, string> = {
    GET: "Get",
    POST: "Post",
    PUT: "Put",
    PATCH: "Patch",
    DELETE: "Delete",
    OPTIONS: "Options",
    HEAD: "Head",
  };
  return map[method] || "Get";
}

function getContentType(request: RequestDefinition): string | null {
  switch (request.body.type) {
    case "json": return "application/json";
    case "form-urlencoded": return "application/x-www-form-urlencoded";
    default: return null;
  }
}
