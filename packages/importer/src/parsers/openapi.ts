import {
  HttpMethod,
  KeyValuePair,
  RequestBody,
  AuthConfig,
  ImportedRequest,
  ImportedFolder,
  ImportedCollection,
} from "../types";
import { v4 as uuidv4 } from "uuid";
import { parse as parseYaml } from "yaml";

// Helper to convert path params from `{userId}` to `{{userId}}`
function normalizePath(path: string): string {
  return path.replace(/{([a-zA-Z0-9_-]+)}/g, "{{$1}}");
}

export function parseOpenApi(input: string): ImportedCollection | null {
  let spec: any = null;

  // 1. Try parsing JSON
  const trimmed = input.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      spec = JSON.parse(trimmed);
    } catch {
      // fallback to YAML parsing
    }
  }

  // 2. Try parsing YAML
  if (!spec) {
    try {
      spec = parseYaml(trimmed);
    } catch (err) {
      return null;
    }
  }

  if (!spec || typeof spec !== "object") {
    return null;
  }

  // Detect format
  const isOpenApi3 = typeof spec.openapi === "string";
  const isSwagger2 = typeof spec.swagger === "string";

  if (!isOpenApi3 && !isSwagger2) {
    return null;
  }

  const collectionName = spec.info?.title || "Imported API Specification";
  const collectionDesc = spec.info?.description || "";
  const folders: ImportedFolder[] = [];
  const requests: (ImportedRequest & { folderId?: string | null })[] = [];

  // Parse servers / Base URL
  let baseUrl = "";
  if (isOpenApi3 && Array.isArray(spec.servers) && spec.servers.length > 0) {
    baseUrl = spec.servers[0].url || "";
  } else if (isSwagger2) {
    const schemes = Array.isArray(spec.schemes) ? spec.schemes : ["http"];
    const host = spec.host || "";
    const basePath = spec.basePath || "";
    if (host) {
      baseUrl = `${schemes[0]}://${host}${basePath}`;
    } else {
      baseUrl = basePath;
    }
  }

  // Setup collection-level variable for baseUrl
  const variables: KeyValuePair[] = [];
  if (baseUrl) {
    variables.push({
      id: uuidv4(),
      key: "baseUrl",
      value: baseUrl,
      enabled: true,
    });
  }

  // Parse folders (from OpenAPI tags)
  const tagToFolderIdMap = new Map<string, string>();
  if (Array.isArray(spec.tags)) {
    spec.tags.forEach((tag: any) => {
      if (tag.name) {
        const folderId = uuidv4();
        tagToFolderIdMap.set(tag.name, folderId);
        folders.push({
          id: folderId,
          name: tag.name,
          description: tag.description || "",
        });
      }
    });
  }

  // Helper to get or create folder for tag not listed in spec.tags
  function getFolderIdForTag(tagName: string): string {
    let folderId = tagToFolderIdMap.get(tagName);
    if (!folderId) {
      folderId = uuidv4();
      tagToFolderIdMap.set(tagName, folderId);
      folders.push({
        id: folderId,
        name: tagName,
        description: "",
      });
    }
    return folderId;
  }

  // Parse security definitions
  const securitySchemes = isOpenApi3
    ? spec.components?.securitySchemes
    : spec.securityDefinitions;

  // Resolve security definition to AuthConfig
  function resolveAuth(secReqs: any[]): AuthConfig {
    if (!secReqs || secReqs.length === 0 || !securitySchemes) {
      return { type: "none" };
    }

    for (const req of secReqs) {
      const schemeName = Object.keys(req)[0];
      if (!schemeName) continue;
      const scheme = securitySchemes[schemeName];
      if (!scheme) continue;

      const type = scheme.type;
      if (type === "http" || type === "basic") {
        if (scheme.scheme === "bearer") {
          return { type: "bearer", token: "" };
        }
        if (scheme.scheme === "basic" || type === "basic") {
          return { type: "basic", username: "", password: "" };
        }
      } else if (type === "apiKey") {
        return {
          type: "apiKey",
          key: scheme.name || "",
          value: "",
          in: scheme.in === "query" ? "query" : "header",
        };
      }
    }

    return { type: "none" };
  }

  // Retrieve global security
  const globalSecurity = spec.security || [];

  // Parse paths
  const paths = spec.paths || {};
  for (const pathKey of Object.keys(paths)) {
    const pathItem = paths[pathKey];
    if (!pathItem || typeof pathItem !== "object") continue;

    // Parameters defined at path-level
    const pathParamsList = Array.isArray(pathItem.parameters)
      ? pathItem.parameters
      : [];

    const methods: HttpMethod[] = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
      "HEAD",
    ];
    for (const m of methods) {
      const methodKey = m.toLowerCase();
      const op = pathItem[methodKey];
      if (!op || typeof op !== "object") continue;

      const name = op.summary || op.operationId || `${m} ${pathKey}`;
      const description = op.description || "";
      const operationId = op.operationId || "";

      // Merge path-level and operation-level parameters
      const opParams = Array.isArray(op.parameters) ? op.parameters : [];
      const allParams = [...pathParamsList, ...opParams];

      const headers: KeyValuePair[] = [];
      const queryParams: KeyValuePair[] = [];
      const pathParams: KeyValuePair[] = [];

      allParams.forEach((param: any) => {
        // Resolve parameter references if any
        if (param.$ref && spec.parameters) {
          const refName = param.$ref.split("/").pop();
          param = spec.parameters[refName] || param;
        }

        if (!param.name) return;

        const kv: KeyValuePair = {
          id: uuidv4(),
          key: param.name,
          value:
            param.schema?.default !== undefined
              ? String(param.schema.default)
              : "",
          enabled: param.required === true,
        };

        const inVal = param.in;
        if (inVal === "header") {
          headers.push(kv);
        } else if (inVal === "query") {
          queryParams.push(kv);
        } else if (inVal === "path") {
          pathParams.push(kv);
        }
      });

      // Parse Body
      let body: RequestBody = { type: "none" };
      if (isOpenApi3 && op.requestBody) {
        const content = op.requestBody.content || {};
        if (content["application/json"]) {
          const jsonSchema = content["application/json"];
          let defaultBody = "";
          if (jsonSchema.example) {
            defaultBody = JSON.stringify(jsonSchema.example, null, 2);
          } else if (jsonSchema.schema) {
            // Generate a simple template block based on schema properties
            const schema = jsonSchema.schema;
            if (schema.example) {
              defaultBody = JSON.stringify(schema.example, null, 2);
            } else if (schema.properties) {
              const mock: Record<string, any> = {};
              Object.keys(schema.properties).forEach((prop) => {
                const propSchema = schema.properties[prop];
                if (propSchema.default !== undefined) {
                  mock[prop] = propSchema.default;
                } else if (propSchema.type === "string") {
                  mock[prop] = "";
                } else if (
                  propSchema.type === "number" ||
                  propSchema.type === "integer"
                ) {
                  mock[prop] = 0;
                } else if (propSchema.type === "boolean") {
                  mock[prop] = false;
                } else {
                  mock[prop] = null;
                }
              });
              defaultBody = JSON.stringify(mock, null, 2);
            }
          }
          body = { type: "json", content: defaultBody || "{}" };
        } else if (content["application/x-www-form-urlencoded"]) {
          const urlencSchema =
            content["application/x-www-form-urlencoded"]?.schema || {};
          const pairs: KeyValuePair[] = [];
          if (urlencSchema.properties) {
            Object.keys(urlencSchema.properties).forEach((prop) => {
              const propSchema = urlencSchema.properties[prop];
              pairs.push({
                id: uuidv4(),
                key: prop,
                value:
                  propSchema.default !== undefined
                    ? String(propSchema.default)
                    : "",
                enabled: true,
              });
            });
          }
          body = { type: "form-urlencoded", pairs };
        } else if (content["multipart/form-data"]) {
          const fdSchema = content["multipart/form-data"]?.schema || {};
          const pairs: KeyValuePair[] = [];
          if (fdSchema.properties) {
            Object.keys(fdSchema.properties).forEach((prop) => {
              const propSchema = fdSchema.properties[prop];
              pairs.push({
                id: uuidv4(),
                key: prop,
                value:
                  propSchema.default !== undefined
                    ? String(propSchema.default)
                    : "",
                enabled: true,
              });
            });
          }
          body = { type: "form-data", pairs };
        }
      } else if (isSwagger2) {
        // Find body parameter
        const bodyParam = allParams.find((p: any) => p.in === "body");
        if (bodyParam) {
          let defaultBody = "";
          if (bodyParam.schema?.example) {
            defaultBody = JSON.stringify(bodyParam.schema.example, null, 2);
          } else if (bodyParam.schema?.properties) {
            const mock: Record<string, any> = {};
            Object.keys(bodyParam.schema.properties).forEach((prop) => {
              const propSchema = bodyParam.schema.properties[prop];
              mock[prop] =
                propSchema.default !== undefined ? propSchema.default : "";
            });
            defaultBody = JSON.stringify(mock, null, 2);
          }
          body = { type: "json", content: defaultBody || "{}" };
        }
      }

      // Parse Auth (Operation security overrides global security)
      const opSecurity = op.security || globalSecurity;
      const auth = resolveAuth(opSecurity);

      // Determine folder (folder is first tag, if any)
      let folderId: string | null = null;
      if (
        Array.isArray(op.tags) &&
        op.tags.length > 0 &&
        typeof op.tags[0] === "string"
      ) {
        folderId = getFolderIdForTag(op.tags[0]);
      }

      // Format URL path as relative using collection-level variable: `{{baseUrl}}/path`
      const normalizedPathString = normalizePath(pathKey);
      const url = baseUrl
        ? `{{baseUrl}}${normalizedPathString}`
        : normalizedPathString;

      requests.push({
        name,
        description,
        operationId,
        method: m,
        url,
        headers,
        queryParams,
        pathParams: pathParams.length > 0 ? pathParams : undefined,
        body,
        auth,
        folderId,
      });
    }
  }

  return {
    name: collectionName,
    description: collectionDesc,
    variables: variables.length > 0 ? variables : undefined,
    folders,
    requests,
  };
}
