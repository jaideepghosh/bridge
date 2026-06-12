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

interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
}

interface PostmanQuery {
  key: string;
  value: string;
  disabled?: boolean;
}

interface PostmanUrl {
  raw?: string;
  host?: string[];
  path?: string[];
  query?: PostmanQuery[];
}

interface PostmanBody {
  mode?: "raw" | "urlencoded" | "formdata" | "file";
  raw?: string;
  urlencoded?: { key: string; value: string; disabled?: boolean }[];
  formdata?: {
    key: string;
    value: string;
    disabled?: boolean;
    type?: string;
  }[];
  options?: {
    raw?: {
      language?: string;
    };
  };
}

interface PostmanAuthParam {
  key: string;
  value: any;
  type?: string;
}

interface PostmanAuth {
  type: string;
  bearer?: PostmanAuthParam[];
  basic?: PostmanAuthParam[];
  apikey?: PostmanAuthParam[];
}

interface PostmanRequest {
  method: string;
  url?: string | PostmanUrl;
  header?: PostmanHeader[];
  body?: PostmanBody;
  auth?: PostmanAuth;
  description?: string;
}

interface PostmanItem {
  name: string;
  description?: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
}

export function parsePostman(json: any): ImportedCollection | null {
  if (
    !json ||
    typeof json !== "object" ||
    !json.info ||
    !Array.isArray(json.item)
  ) {
    return null;
  }

  const collectionName = json.info.name || "Imported Postman Collection";
  const collectionDesc = json.info.description || "";
  const folders: ImportedFolder[] = [];
  const requests: (ImportedRequest & { folderId?: string | null })[] = [];

  // Parse collection-level variables
  const variables: KeyValuePair[] = [];
  if (Array.isArray(json.variable)) {
    json.variable.forEach((v: any) => {
      if (v.key) {
        variables.push({
          id: uuidv4(),
          key: v.key,
          value: v.value !== undefined ? String(v.value) : "",
          enabled: v.disabled !== true,
        });
      }
    });
  }

  function traverse(
    items: PostmanItem[],
    parentFolderId: string | null = null,
  ) {
    for (const item of items) {
      if (Array.isArray(item.item)) {
        // It's a folder
        const folderId = uuidv4();
        folders.push({
          id: folderId,
          name: item.name || "Folder",
          description:
            typeof item.description === "string" ? item.description : "",
          parentFolderId,
        });
        traverse(item.item, folderId);
      } else if (item.request) {
        // It's a request
        const req = item.request;
        const method = (req.method || "GET").toUpperCase() as HttpMethod;

        // Parse URL
        let rawUrl = "";
        let queryParams: KeyValuePair[] = [];
        if (typeof req.url === "string") {
          rawUrl = req.url;
        } else if (req.url && typeof req.url === "object") {
          rawUrl = req.url.raw || "";
          if (!rawUrl && Array.isArray(req.url.host)) {
            const proto = (req.url as any).protocol
              ? `${(req.url as any).protocol}://`
              : "";
            const hostStr = req.url.host.join(".");
            const pathStr = Array.isArray(req.url.path)
              ? "/" + req.url.path.join("/")
              : "";
            rawUrl = `${proto}${hostStr}${pathStr}`;
          }
          if (Array.isArray(req.url.query)) {
            queryParams = req.url.query
              .filter((q) => q.key)
              .map((q) => ({
                id: uuidv4(),
                key: q.key,
                value: q.value || "",
                enabled: q.disabled !== true,
              }));
          }
        }

        // Parse Headers
        const headers: KeyValuePair[] = [];
        if (Array.isArray(req.header)) {
          req.header.forEach((h) => {
            if (h.key) {
              headers.push({
                id: uuidv4(),
                key: h.key,
                value: h.value || "",
                enabled: h.disabled !== true,
              });
            }
          });
        }

        // Parse Body
        let body: RequestBody = { type: "none" };
        if (req.body) {
          const mode = req.body.mode;
          if (mode === "raw" && req.body.raw !== undefined) {
            const isJson =
              req.body.options?.raw?.language === "json" ||
              req.body.raw.trim().startsWith("{") ||
              req.body.raw.trim().startsWith("[");
            body = {
              type: isJson ? "json" : "raw",
              content: req.body.raw,
            };
          } else if (
            mode === "urlencoded" &&
            Array.isArray(req.body.urlencoded)
          ) {
            body = {
              type: "form-urlencoded",
              pairs: req.body.urlencoded
                .filter((p) => p.key)
                .map((p) => ({
                  id: uuidv4(),
                  key: p.key,
                  value: p.value || "",
                  enabled: p.disabled !== true,
                })),
            };
          } else if (mode === "formdata" && Array.isArray(req.body.formdata)) {
            body = {
              type: "form-data",
              pairs: req.body.formdata
                .filter((p) => p.key)
                .map((p) => ({
                  id: uuidv4(),
                  key: p.key,
                  value: p.value || "",
                  enabled: p.disabled !== true,
                })),
            };
          }
        }

        // Parse Auth
        let auth: AuthConfig = { type: "none" };
        if (req.auth) {
          const authType = req.auth.type;
          const getParam = (
            params: PostmanAuthParam[] | undefined,
            key: string,
          ) => params?.find((p) => p.key === key)?.value;

          if (authType === "bearer" && req.auth.bearer) {
            auth = {
              type: "bearer",
              token: String(getParam(req.auth.bearer, "token") || ""),
            };
          } else if (authType === "basic" && req.auth.basic) {
            auth = {
              type: "basic",
              username: String(getParam(req.auth.basic, "username") || ""),
              password: String(getParam(req.auth.basic, "password") || ""),
            };
          } else if (authType === "apikey" && req.auth.apikey) {
            auth = {
              type: "apiKey",
              key: String(getParam(req.auth.apikey, "key") || ""),
              value: String(getParam(req.auth.apikey, "value") || ""),
              in:
                (getParam(req.auth.apikey, "in") || "header") === "query"
                  ? "query"
                  : "header",
            };
          }
        }

        requests.push({
          name: item.name || "Request",
          description:
            typeof req.description === "string" ? req.description : "",
          method,
          url: rawUrl,
          headers,
          queryParams,
          body,
          auth,
          folderId: parentFolderId,
        });
      }
    }
  }

  traverse(json.item);

  return {
    name: collectionName,
    description: collectionDesc,
    variables: variables.length > 0 ? variables : undefined,
    folders,
    requests,
  };
}
