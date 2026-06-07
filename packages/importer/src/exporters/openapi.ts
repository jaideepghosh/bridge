import { ImportedCollection, ImportedFolder, ImportedRequest } from "../types";
import { Exporter, ExportResult } from "./types";

function parseUrlParts(urlStr: string): { server: string; path: string } {
  let server = "http://localhost";
  let path = urlStr;

  const httpMatch = urlStr.match(/^(https?:\/\/[^\/]+)(.*)$/);
  if (httpMatch) {
    server = httpMatch[1] || "http://localhost";
    path = httpMatch[2] || "/";
  } else {
    const varMatch = urlStr.match(/^(\{\{[^\}]+\}\})(.*)$/);
    if (varMatch) {
      server = varMatch[1] || "{{host}}";
      path = varMatch[2] || "/";
    }
  }

  // Strip query parameters for the path endpoint in paths key
  const questionMarkIdx = path.indexOf("?");
  if (questionMarkIdx !== -1) {
    path = path.substring(0, questionMarkIdx);
  }
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  return { server, path };
}

function buildOpenApiOperation(
  req: ImportedRequest,
  tags: string[],
  securitySchemes: Record<string, any>
): any {
  const parameters: any[] = [];

  // 1. Path parameters
  if (req.pathParams) {
    req.pathParams.forEach(p => {
      parameters.push({
        name: p.key,
        in: "path",
        required: true,
        schema: { type: "string" },
        example: p.value
      });
    });
  }

  // 2. Query parameters
  req.queryParams.forEach(q => {
    parameters.push({
      name: q.key,
      in: "query",
      required: false,
      schema: { type: "string" },
      example: q.value
    });
  });

  // 3. Headers (excluding Content-Type and Authorization)
  const skipHeaders = ["content-type", "authorization"];
  req.headers
    .filter(h => !skipHeaders.includes(h.key.toLowerCase()))
    .forEach(h => {
      parameters.push({
        name: h.key,
        in: "header",
        required: false,
        schema: { type: "string" },
        example: h.value
      });
    });

  // 4. Request Body
  let requestBody: any = undefined;
  if (req.body && req.body.type !== "none") {
    if (req.body.type === "json") {
      let exampleValue: any;
      try {
        exampleValue = JSON.parse(req.body.content);
      } catch {
        exampleValue = req.body.content;
      }
      requestBody = {
        content: {
          "application/json": {
            schema: { type: "object" },
            example: exampleValue
          }
        }
      };
    } else if (req.body.type === "raw") {
      requestBody = {
        content: {
          "text/plain": {
            schema: { type: "string" },
            example: req.body.content
          }
        }
      };
    } else if (req.body.type === "form-urlencoded") {
      const properties: Record<string, any> = {};
      req.body.pairs.forEach(p => {
        properties[p.key] = { type: "string", example: p.value };
      });
      requestBody = {
        content: {
          "application/x-www-form-urlencoded": {
            schema: {
              type: "object",
              properties
            }
          }
        }
      };
    } else if (req.body.type === "form-data") {
      const properties: Record<string, any> = {};
      req.body.pairs.forEach(p => {
        properties[p.key] = { type: "string", format: "binary", example: p.value };
      });
      requestBody = {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties
            }
          }
        }
      };
    }
  }

  // 5. Auth / Security
  const security: any[] = [];
  if (req.auth && req.auth.type !== "none") {
    const a = req.auth;
    if (a.type === "bearer") {
      securitySchemes["BearerAuth"] = {
        type: "http",
        scheme: "bearer"
      };
      security.push({ BearerAuth: [] });
    } else if (a.type === "basic") {
      securitySchemes["BasicAuth"] = {
        type: "http",
        scheme: "basic"
      };
      security.push({ BasicAuth: [] });
    } else if (a.type === "apiKey") {
      securitySchemes["ApiKeyAuth"] = {
        type: "apiKey",
        name: a.key,
        in: a.in
      };
      security.push({ ApiKeyAuth: [] });
    }
  }

  return {
    summary: req.name,
    description: req.description || "",
    operationId: req.operationId || undefined,
    tags: tags.length > 0 ? tags : undefined,
    parameters: parameters.length > 0 ? parameters : undefined,
    requestBody,
    responses: {
      "200": {
        description: "Successful response"
      }
    },
    security: security.length > 0 ? security : undefined
  };
}

export class OpenApiExporter implements Exporter {
  id = "openapi-json";
  name = "OpenAPI Specification";
  fileExtension = "json";

  exportCollection(collection: ImportedCollection): ExportResult {
    const serversMap = new Set<string>();
    const securitySchemes: Record<string, any> = {};
    const paths: Record<string, any> = {};

    const getFolderTags = (folderId: string | null | undefined): string[] => {
      if (!folderId) return [];
      const folder = collection.folders.find(f => f.id === folderId);
      if (!folder) return [];
      const parentTags = getFolderTags(folder.parentFolderId);
      return [...parentTags, folder.name];
    };

    // Process all requests
    collection.requests.forEach(r => {
      const { server, path } = parseUrlParts(r.url);
      serversMap.add(server);

      const tags = getFolderTags(r.folderId);
      const operation = buildOpenApiOperation(r, tags, securitySchemes);
      const method = r.method.toLowerCase();

      if (!paths[path]) {
        paths[path] = {};
      }
      paths[path][method] = operation;
    });

    const openapiDoc = {
      openapi: "3.0.3",
      info: {
        title: collection.name || "Bridge Exported API",
        description: collection.description || "",
        version: "1.0.0"
      },
      servers: Array.from(serversMap).map(url => ({ url })),
      paths,
      components: Object.keys(securitySchemes).length > 0 ? { securitySchemes } : undefined
    };

    return {
      filename: `${collection.name || "openapi"}.json`,
      content: JSON.stringify(openapiDoc, null, 2),
      mimeType: "application/json"
    };
  }

  exportFolder(
    folder: ImportedFolder,
    subfolders: ImportedFolder[],
    requests: (ImportedRequest & { folderId?: string | null })[]
  ): ExportResult {
    const serversMap = new Set<string>();
    const securitySchemes: Record<string, any> = {};
    const paths: Record<string, any> = {};

    const allFolders = [folder, ...subfolders];
    const getFolderTags = (folderId: string | null | undefined): string[] => {
      if (!folderId) return [];
      const f = allFolders.find(x => x.id === folderId);
      if (!f) return [];
      const parentTags = getFolderTags(f.parentFolderId);
      return [...parentTags, f.name];
    };

    requests.forEach(r => {
      const { server, path } = parseUrlParts(r.url);
      serversMap.add(server);

      const tags = getFolderTags(r.folderId);
      const operation = buildOpenApiOperation(r, tags, securitySchemes);
      const method = r.method.toLowerCase();

      if (!paths[path]) {
        paths[path] = {};
      }
      paths[path][method] = operation;
    });

    const openapiDoc = {
      openapi: "3.0.3",
      info: {
        title: folder.name || "Bridge Exported Folder",
        description: folder.description || "",
        version: "1.0.0"
      },
      servers: Array.from(serversMap).map(url => ({ url })),
      paths,
      components: Object.keys(securitySchemes).length > 0 ? { securitySchemes } : undefined
    };

    return {
      filename: `${folder.name || "folder"}.json`,
      content: JSON.stringify(openapiDoc, null, 2),
      mimeType: "application/json"
    };
  }

  exportRequest(request: ImportedRequest): ExportResult {
    const securitySchemes: Record<string, any> = {};
    const { server, path } = parseUrlParts(request.url);
    const operation = buildOpenApiOperation(request, [], securitySchemes);
    const method = request.method.toLowerCase();

    const paths: Record<string, any> = {
      [path]: {
        [method]: operation
      }
    };

    const openapiDoc = {
      openapi: "3.0.3",
      info: {
        title: request.name || "Bridge Exported Request",
        description: request.description || "",
        version: "1.0.0"
      },
      servers: [{ url: server }],
      paths,
      components: Object.keys(securitySchemes).length > 0 ? { securitySchemes } : undefined
    };

    return {
      filename: `${request.name || "request"}.json`,
      content: JSON.stringify(openapiDoc, null, 2),
      mimeType: "application/json"
    };
  }
}
