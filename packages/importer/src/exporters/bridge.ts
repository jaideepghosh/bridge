import { ImportedCollection, ImportedFolder, ImportedRequest } from "../types";
import { Exporter, ExportResult } from "./types";

export class BridgeExporter implements Exporter {
  id = "bridge-json";
  name = "Bridge JSON";
  fileExtension = "json";

  exportCollection(collection: ImportedCollection): ExportResult {
    const cleanCollection = {
      $schema: "https://bridge.jaideepghosh.com/schemas/collection-v1.json",
      type: "collection",
      name: collection.name,
      description: collection.description,
      config: collection.config,
      variables: collection.variables,
      folders: collection.folders.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        parentFolderId: f.parentFolderId,
        config: f.config,
      })),
      requests: collection.requests.map((r) => ({
        name: r.name,
        method: r.method,
        url: r.url,
        description: r.description,
        operationId: r.operationId,
        headers: r.headers,
        queryParams: r.queryParams,
        pathParams: r.pathParams,
        body: r.body,
        auth: r.auth,
        folderId: r.folderId,
      })),
    };

    return {
      filename: `${collection.name || "collection"}.json`,
      content: JSON.stringify(cleanCollection, null, 2),
      mimeType: "application/json",
    };
  }

  exportFolder(
    folder: ImportedFolder,
    subfolders: ImportedFolder[],
    requests: (ImportedRequest & { folderId?: string | null })[],
  ): ExportResult {
    const cleanFolder = {
      $schema: "https://bridge.jaideepghosh.com/schemas/folder-v1.json",
      type: "folder",
      id: folder.id,
      name: folder.name,
      description: folder.description,
      parentFolderId: folder.parentFolderId,
      config: folder.config,
      folders: subfolders.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        parentFolderId: f.parentFolderId,
        config: f.config,
      })),
      requests: requests.map((r) => ({
        name: r.name,
        method: r.method,
        url: r.url,
        description: r.description,
        operationId: r.operationId,
        headers: r.headers,
        queryParams: r.queryParams,
        pathParams: r.pathParams,
        body: r.body,
        auth: r.auth,
        folderId: r.folderId,
      })),
    };

    return {
      filename: `${folder.name || "folder"}.json`,
      content: JSON.stringify(cleanFolder, null, 2),
      mimeType: "application/json",
    };
  }

  exportRequest(request: ImportedRequest): ExportResult {
    const cleanRequest = {
      $schema: "https://bridge.jaideepghosh.com/schemas/request-v1.json",
      type: "request",
      name: request.name,
      method: request.method,
      url: request.url,
      description: request.description,
      operationId: request.operationId,
      headers: request.headers,
      queryParams: request.queryParams,
      pathParams: request.pathParams,
      body: request.body,
      auth: request.auth,
    };

    return {
      filename: `${request.name || "request"}.json`,
      content: JSON.stringify(cleanRequest, null, 2),
      mimeType: "application/json",
    };
  }
}
