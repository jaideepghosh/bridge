import type { CodeGenerator, RequestDefinition } from "../types";
import { getAllHeaders, buildFullUrl } from "../utils/formatting";

export const axiosGenerator: CodeGenerator = {
  id: "javascript-axios",
  name: "JavaScript - Axios",
  language: "javascript",

  generate(request: RequestDefinition): string {
    const url = buildFullUrl(request);
    const headers = getAllHeaders(request);
    const lines: string[] = [];

    lines.push(`import axios from "axios";`);
    lines.push(``);

    const config: string[] = [];
    config.push(`  method: "${request.method.toLowerCase()}"`);
    config.push(`  url: "${url}"`);

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
      config.push(`  headers: {\n${headerLines}\n  }`);
    }

    // Body
    const body = getDataString(request);
    if (body) {
      config.push(`  data: ${body}`);
    }

    lines.push(`axios({`);
    lines.push(config.join(",\n"));
    lines.push(`})`);
    lines.push(`  .then(response => console.log(response.data))`);
    lines.push(`  .catch(error => console.error(error));`);

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

function getDataString(request: RequestDefinition): string | null {
  switch (request.body.type) {
    case "none":
      return null;
    case "json":
      return request.body.content;
    case "raw":
      return `"${request.body.content.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
    case "form-urlencoded": {
      const pairs = request.body.pairs.filter((p) => p.enabled && p.key);
      const entries = pairs
        .map((p) => `    ${p.key}: "${p.value}"`)
        .join(",\n");
      return `new URLSearchParams({\n${entries}\n  })`;
    }
    case "form-data": {
      const pairs = request.body.pairs.filter((p) => p.enabled && p.key);
      const lines = pairs.map(
        (p) => `formData.append("${p.key}", "${p.value}");`,
      );
      return `(() => {\n    const formData = new FormData();\n    ${lines.join("\n    ")}\n    return formData;\n  })()`;
    }
  }
}
