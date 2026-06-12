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

export type RequestBody =
  | { type: "none" }
  | { type: "json"; content: string }
  | { type: "raw"; content: string }
  | { type: "form-urlencoded"; pairs: KeyValuePair[] }
  | { type: "form-data"; pairs: KeyValuePair[] };

export interface RequestDefinition {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
}

export interface CodeGenerator {
  id: string;
  name: string;
  language: string;
  generate(request: RequestDefinition): string;
}
