import type { CodeGenerator, RequestDefinition } from "../types";
import {
  getAllHeaders,
  getEnabledParams,
  getAuthQueryParams,
} from "../utils/formatting";

export const goGenerator: CodeGenerator = {
  id: "go",
  name: "Go - net/http",
  language: "go",

  generate(request: RequestDefinition): string {
    const headers = getAllHeaders(request);
    const params = [
      ...getEnabledParams(request),
      ...getAuthQueryParams(request.auth),
    ];
    const lines: string[] = [];

    lines.push(`package main`);
    lines.push(``);
    lines.push(`import (`);
    lines.push(`\t"fmt"`);
    lines.push(`\t"io"`);
    lines.push(`\t"net/http"`);

    const needsStrings =
      request.body.type === "json" || request.body.type === "raw";
    const needsUrl = params.length > 0;

    if (needsStrings) lines.push(`\t"strings"`);
    if (needsUrl) lines.push(`\t"net/url"`);

    lines.push(`)`);
    lines.push(``);
    lines.push(`func main() {`);

    // URL with params
    if (params.length > 0) {
      lines.push(`\tbaseURL := "${request.url}"`);
      lines.push(`\tparams := url.Values{}`);
      for (const p of params) {
        lines.push(`\tparams.Set("${p.key}", "${p.value}")`);
      }
      lines.push(`\tfullURL := baseURL + "?" + params.Encode()`);
    }

    const urlVar = params.length > 0 ? "fullURL" : `"${request.url}"`;

    // Body
    let bodyVar = "nil";
    switch (request.body.type) {
      case "json": {
        const escaped = request.body.content.replace(/`/g, '` + "`" + `');
        lines.push(`\tbody := strings.NewReader(\`${escaped}\`)`);
        bodyVar = "body";
        if (!headers["Content-Type"])
          headers["Content-Type"] = "application/json";
        break;
      }
      case "raw": {
        const escaped = request.body.content.replace(/`/g, '` + "`" + `');
        lines.push(`\tbody := strings.NewReader(\`${escaped}\`)`);
        bodyVar = "body";
        break;
      }
      case "form-urlencoded": {
        const pairs = request.body.pairs.filter((p) => p.enabled && p.key);
        lines.push(`\tformData := url.Values{}`);
        for (const p of pairs) {
          lines.push(`\tformData.Set("${p.key}", "${p.value}")`);
        }
        lines.push(`\tbody := strings.NewReader(formData.Encode())`);
        bodyVar = "body";
        if (!headers["Content-Type"])
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        break;
      }
      case "form-data": {
        const pairs = request.body.pairs.filter((p) => p.enabled && p.key);
        lines.push(
          `\t// Note: For multipart form data, use mime/multipart package`,
        );
        lines.push(`\tformData := url.Values{}`);
        for (const p of pairs) {
          lines.push(`\tformData.Set("${p.key}", "${p.value}")`);
        }
        lines.push(`\tbody := strings.NewReader(formData.Encode())`);
        bodyVar = "body";
        break;
      }
    }

    lines.push(``);
    lines.push(
      `\treq, err := http.NewRequest("${request.method}", ${urlVar}, ${bodyVar})`,
    );
    lines.push(`\tif err != nil {`);
    lines.push(`\t\tpanic(err)`);
    lines.push(`\t}`);

    // Headers
    for (const [key, value] of Object.entries(headers)) {
      lines.push(`\treq.Header.Set("${key}", "${value}")`);
    }

    lines.push(``);
    lines.push(`\tclient := &http.Client{}`);
    lines.push(`\tresp, err := client.Do(req)`);
    lines.push(`\tif err != nil {`);
    lines.push(`\t\tpanic(err)`);
    lines.push(`\t}`);
    lines.push(`\tdefer resp.Body.Close()`);
    lines.push(``);
    lines.push(`\trespBody, _ := io.ReadAll(resp.Body)`);
    lines.push(`\tfmt.Println(string(respBody))`);
    lines.push(`}`);

    return lines.join("\n");
  },
};
