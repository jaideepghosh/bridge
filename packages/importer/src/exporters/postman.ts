import { ImportedCollection, ImportedFolder, ImportedRequest } from "../types";
import { Exporter, ExportResult } from "./types";

function mapRequestToPostman(req: ImportedRequest): any {
  const method = req.method;
  const header = req.headers.map(h => ({
    key: h.key,
    value: h.value,
    disabled: !h.enabled,
  }));

  let urlObj: any = req.url;
  if (req.queryParams.length > 0) {
    urlObj = {
      raw: req.url,
      query: req.queryParams.map(q => ({
        key: q.key,
        value: q.value,
        disabled: !q.enabled
      }))
    };
  }

  let body: any = undefined;
  if (req.body && req.body.type !== "none") {
    if (req.body.type === "json") {
      body = {
        mode: "raw",
        raw: req.body.content,
        options: {
          raw: {
            language: "json"
          }
        }
      };
    } else if (req.body.type === "raw") {
      body = {
        mode: "raw",
        raw: req.body.content
      };
    } else if (req.body.type === "form-urlencoded") {
      body = {
        mode: "urlencoded",
        urlencoded: req.body.pairs.map(p => ({
          key: p.key,
          value: p.value,
          disabled: !p.enabled
        }))
      };
    } else if (req.body.type === "form-data") {
      body = {
        mode: "formdata",
        formdata: req.body.pairs.map(p => ({
          key: p.key,
          value: p.value,
          disabled: !p.enabled,
          type: "text"
        }))
      };
    }
  }

  let auth: any = undefined;
  if (req.auth && req.auth.type !== "none") {
    if (req.auth.type === "bearer") {
      auth = {
        type: "bearer",
        bearer: [
          { key: "token", value: req.auth.token, type: "string" }
        ]
      };
    } else if (req.auth.type === "basic") {
      auth = {
        type: "basic",
        basic: [
          { key: "username", value: req.auth.username, type: "string" },
          { key: "password", value: req.auth.password, type: "string" }
        ]
      };
    } else if (req.auth.type === "apiKey") {
      auth = {
        type: "apikey",
        apikey: [
          { key: "key", value: req.auth.key, type: "string" },
          { key: "value", value: req.auth.value, type: "string" },
          { key: "in", value: req.auth.in, type: "string" }
        ]
      };
    }
  }

  return {
    name: req.name,
    request: {
      method,
      header,
      url: urlObj,
      body,
      auth,
      description: req.description,
    }
  };
}

function buildPostmanItems(
  folders: ImportedFolder[],
  requests: (ImportedRequest & { folderId?: string | null })[],
  parentFolderId: string | null = null
): any[] {
  const items: any[] = [];

  const currentFolders = folders.filter(f => f.parentFolderId === parentFolderId);
  for (const f of currentFolders) {
    let folderAuth: any = undefined;
    if (f.config?.auth && f.config.auth.type !== "none") {
      const a = f.config.auth;
      if (a.type === "bearer") {
        folderAuth = {
          type: "bearer",
          bearer: [{ key: "token", value: a.token, type: "string" }]
        };
      } else if (a.type === "basic") {
        folderAuth = {
          type: "basic",
          basic: [
            { key: "username", value: a.username, type: "string" },
            { key: "password", value: a.password, type: "string" }
          ]
        };
      } else if (a.type === "apiKey") {
        folderAuth = {
          type: "apikey",
          apikey: [
            { key: "key", value: a.key, type: "string" },
            { key: "value", value: a.value, type: "string" },
            { key: "in", value: a.in, type: "string" }
          ]
        };
      }
    }

    items.push({
      name: f.name,
      description: f.description,
      auth: folderAuth,
      item: buildPostmanItems(folders, requests, f.id)
    });
  }

  const currentRequests = requests.filter(r => r.folderId === parentFolderId);
  for (const r of currentRequests) {
    items.push(mapRequestToPostman(r));
  }

  return items;
}

export class PostmanExporter implements Exporter {
  id = "postman-json";
  name = "Postman Collection";
  fileExtension = "json";

  exportCollection(collection: ImportedCollection): ExportResult {
    let collectionAuth: any = undefined;
    if (collection.config?.auth && collection.config.auth.type !== "none") {
      const a = collection.config.auth;
      if (a.type === "bearer") {
        collectionAuth = {
          type: "bearer",
          bearer: [{ key: "token", value: a.token, type: "string" }]
        };
      } else if (a.type === "basic") {
        collectionAuth = {
          type: "basic",
          basic: [
            { key: "username", value: a.username, type: "string" },
            { key: "password", value: a.password, type: "string" }
          ]
        };
      } else if (a.type === "apiKey") {
        collectionAuth = {
          type: "apikey",
          apikey: [
            { key: "key", value: a.key, type: "string" },
            { key: "value", value: a.value, type: "string" },
            { key: "in", value: a.in, type: "string" }
          ]
        };
      }
    }

    const variables = (collection.config?.variables || collection.variables || []).map(v => ({
      key: v.key,
      value: v.value,
      type: "string"
    }));

    const postmanCollection = {
      info: {
        name: collection.name || "Bridge Exported Collection",
        description: collection.description || "",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      auth: collectionAuth,
      variable: variables.length > 0 ? variables : undefined,
      item: buildPostmanItems(collection.folders, collection.requests, null)
    };

    return {
      filename: `${collection.name || "collection"}.postman_collection.json`,
      content: JSON.stringify(postmanCollection, null, 2),
      mimeType: "application/json"
    };
  }

  exportFolder(
    folder: ImportedFolder,
    subfolders: ImportedFolder[],
    requests: (ImportedRequest & { folderId?: string | null })[]
  ): ExportResult {
    let folderAuth: any = undefined;
    if (folder.config?.auth && folder.config.auth.type !== "none") {
      const a = folder.config.auth;
      if (a.type === "bearer") {
        folderAuth = {
          type: "bearer",
          bearer: [{ key: "token", value: a.token, type: "string" }]
        };
      } else if (a.type === "basic") {
        folderAuth = {
          type: "basic",
          basic: [
            { key: "username", value: a.username, type: "string" },
            { key: "password", value: a.password, type: "string" }
          ]
        };
      } else if (a.type === "apiKey") {
        folderAuth = {
          type: "apikey",
          apikey: [
            { key: "key", value: a.key, type: "string" },
            { key: "value", value: a.value, type: "string" },
            { key: "in", value: a.in, type: "string" }
          ]
        };
      }
    }

    const postmanCollection = {
      info: {
        name: folder.name || "Bridge Exported Folder",
        description: folder.description || "",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: folder.name,
          description: folder.description,
          auth: folderAuth,
          item: buildPostmanItems(subfolders, requests, folder.id)
        }
      ]
    };

    return {
      filename: `${folder.name || "folder"}.postman_collection.json`,
      content: JSON.stringify(postmanCollection, null, 2),
      mimeType: "application/json"
    };
  }

  exportRequest(request: ImportedRequest): ExportResult {
    const postmanCollection = {
      info: {
        name: request.name || "Bridge Exported Request",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        mapRequestToPostman(request)
      ]
    };

    return {
      filename: `${request.name || "request"}.postman_collection.json`,
      content: JSON.stringify(postmanCollection, null, 2),
      mimeType: "application/json"
    };
  }
}
