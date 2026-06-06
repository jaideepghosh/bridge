import type { CodeGenerator, RequestDefinition } from "../types";
import { getAllHeaders, buildFullUrl } from "../utils/formatting";

export const csharpGenerator: CodeGenerator = {
  id: "csharp",
  name: "C# - HttpClient",
  language: "csharp",

  generate(request: RequestDefinition): string {
    const url = buildFullUrl(request);
    const headers = getAllHeaders(request);
    const lines: string[] = [];

    lines.push(`using System.Net.Http;`);
    lines.push(`using System.Text;`);
    lines.push(``);
    lines.push(`var client = new HttpClient();`);
    lines.push(``);

    // Build request message
    lines.push(`var request = new HttpRequestMessage(HttpMethod.${capitalizeMethod(request.method)}, "${url}");`);

    // Headers
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === "content-type") continue; // Set on content
      lines.push(`request.Headers.Add("${key}", "${value}");`);
    }

    // Body
    switch (request.body.type) {
      case "json": {
        const escaped = request.body.content.replace(/"/g, '\\"').replace(/\n/g, "\\n");
        lines.push(`request.Content = new StringContent("${escaped}", Encoding.UTF8, "application/json");`);
        break;
      }
      case "raw": {
        const escaped = request.body.content.replace(/"/g, '\\"').replace(/\n/g, "\\n");
        const ct = headers["Content-Type"] || "text/plain";
        lines.push(`request.Content = new StringContent("${escaped}", Encoding.UTF8, "${ct}");`);
        break;
      }
      case "form-urlencoded": {
        const pairs = request.body.pairs.filter(p => p.enabled && p.key);
        lines.push(`request.Content = new FormUrlEncodedContent(new[]`);
        lines.push(`{`);
        for (const p of pairs) {
          lines.push(`    new KeyValuePair<string, string>("${p.key}", "${p.value}"),`);
        }
        lines.push(`});`);
        break;
      }
      case "form-data": {
        const pairs = request.body.pairs.filter(p => p.enabled && p.key);
        lines.push(`var content = new MultipartFormDataContent();`);
        for (const p of pairs) {
          lines.push(`content.Add(new StringContent("${p.value}"), "${p.key}");`);
        }
        lines.push(`request.Content = content;`);
        break;
      }
    }

    lines.push(``);
    lines.push(`var response = await client.SendAsync(request);`);
    lines.push(`var body = await response.Content.ReadAsStringAsync();`);
    lines.push(`Console.WriteLine(body);`);

    return lines.join("\n");
  },
};

function capitalizeMethod(method: string): string {
  const map: Record<string, string> = {
    GET: "Get",
    POST: "Post",
    PUT: "Put",
    PATCH: "Patch",
    DELETE: "Delete",
    OPTIONS: "Options",
    HEAD: "Head",
  };
  return map[method] || method;
}
