export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export type KeyValuePair = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type AuthConfig =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "basic"; username: string; password: string }
  | { type: "apiKey"; key: string; value: string; in: "header" | "query" };

export type ScopeConfig = {
  auth?: AuthConfig;
  headers?: KeyValuePair[];
  variables?: KeyValuePair[];
};

export type RequestBody =
  | { type: "none" }
  | { type: "json"; content: string }
  | { type: "raw"; content: string }
  | { type: "form-urlencoded"; pairs: KeyValuePair[] }
  | { type: "form-data"; pairs: KeyValuePair[] };

export type SavedRequest = {
  id: string;
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
  tags?: string[];
  folderId?: string | null;
  collectionId: string;
  createdAt: string;
  updatedAt: string;
};

export type ProxyResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
  size: number;
  contentType?: string;
  isUnreachableUrl?: boolean;
};

export type ProxyRequestInput = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
  timeoutMs?: number | null;
};

export type ApiExample = {
  id: string;
  requestId: string;
  name: string;
  tags?: string[];
  request: SavedRequest;
  response: ProxyResponse;
  createdAt: string;
};

export type EnvironmentVariable = {
  id: string;
  key: string;
  initialValue: string;
  currentValue: string;
  enabled: boolean;
  isSecret: boolean;
};

export type Environment = {
  id: string;
  name: string;
  description?: string;
  variables: EnvironmentVariable[];
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  name: string;
  description?: string;
  collectionId: string;
  parentFolderId?: string | null;
  config?: ScopeConfig;
  createdAt: string;
  updatedAt: string;
};

export type Collection = {
  id: string;
  name: string;
  description?: string;
  config?: ScopeConfig;
  createdAt: string;
  updatedAt: string;
};

export type ActiveTab = {
  id: string;
  requestId?: string;
  isDirty: boolean;
  draft: {
    name: string;
    method: HttpMethod;
    url: string;
    headers: KeyValuePair[];
    queryParams: KeyValuePair[];
    body: RequestBody;
    auth: AuthConfig;
    description: string;
  };
  response?: ProxyResponse | null;
  isLoading?: boolean;
};
