import type { CodeGenerator, RequestDefinition } from "../types";
import { getAllHeaders, buildFullUrl } from "../utils/formatting";

export const javaGenerator: CodeGenerator = {
  id: "java",
  name: "Java - HttpClient",
  language: "java",

  generate(request: RequestDefinition): string {
    const url = buildFullUrl(request);
    const headers = getAllHeaders(request);
    const lines: string[] = [];

    lines.push(`import java.net.URI;`);
    lines.push(`import java.net.http.HttpClient;`);
    lines.push(`import java.net.http.HttpRequest;`);
    lines.push(`import java.net.http.HttpResponse;`);
    lines.push(``);

    lines.push(`HttpClient client = HttpClient.newHttpClient();`);
    lines.push(``);

    // Body publisher
    let bodyPublisher = "HttpRequest.BodyPublishers.noBody()";
    switch (request.body.type) {
      case "json": {
        const escaped = request.body.content.replace(/"/g, '\\"').replace(/\n/g, "\\n");
        lines.push(`String body = "${escaped}";`);
        bodyPublisher = "HttpRequest.BodyPublishers.ofString(body)";
        if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
        break;
      }
      case "raw": {
        const escaped = request.body.content.replace(/"/g, '\\"').replace(/\n/g, "\\n");
        lines.push(`String body = "${escaped}";`);
        bodyPublisher = "HttpRequest.BodyPublishers.ofString(body)";
        break;
      }
      case "form-urlencoded": {
        const pairs = request.body.pairs.filter(p => p.enabled && p.key);
        const formStr = pairs.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join("&");
        lines.push(`String body = "${formStr}";`);
        bodyPublisher = "HttpRequest.BodyPublishers.ofString(body)";
        if (!headers["Content-Type"]) headers["Content-Type"] = "application/x-www-form-urlencoded";
        break;
      }
      case "form-data": {
        const pairs = request.body.pairs.filter(p => p.enabled && p.key);
        const formStr = pairs.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join("&");
        lines.push(`// Note: For true multipart, use a multipart body builder`);
        lines.push(`String body = "${formStr}";`);
        bodyPublisher = "HttpRequest.BodyPublishers.ofString(body)";
        break;
      }
    }

    lines.push(``);
    lines.push(`HttpRequest request = HttpRequest.newBuilder()`);
    lines.push(`    .uri(URI.create("${url}"))`);
    lines.push(`    .method("${request.method}", ${bodyPublisher})`);

    for (const [key, value] of Object.entries(headers)) {
      lines.push(`    .header("${key}", "${value}")`);
    }

    lines.push(`    .build();`);
    lines.push(``);
    lines.push(`HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());`);
    lines.push(`System.out.println(response.body());`);

    return lines.join("\n");
  },
};
