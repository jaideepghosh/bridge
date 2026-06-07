export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type AuthConfig =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "basic"; username: string; password: string }
  | { type: "apiKey"; key: string; value: string; in: "header" | "query" };

export type RequestBody =
  | { type: "none" }
  | { type: "json"; content: string }
  | { type: "raw"; content: string }
  | { type: "form-urlencoded"; pairs: KeyValuePair[] }
  | { type: "form-data"; pairs: KeyValuePair[] };

export interface ImportedRequest {
  name: string;
  method: HttpMethod;
  url: string;
  description?: string;
  operationId?: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  pathParams?: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
}

export interface ImportedFolder {
  id: string;
  name: string;
  description?: string;
  parentFolderId?: string | null;
}

export interface ImportedCollection {
  name: string;
  description?: string;
  variables?: KeyValuePair[];
  folders: ImportedFolder[];
  requests: (ImportedRequest & { folderId?: string | null })[];
}

export type ImportResult =
  | { type: "request"; data: ImportedRequest }
  | { type: "collection"; data: ImportedCollection };
