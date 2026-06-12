import {
  Collection,
  Environment,
  ActiveTab,
  KeyValuePair,
  AuthConfig,
  Folder,
} from "../types";
import { resolveVariables } from "./resolver";

type InheritedConfig = {
  auth?: AuthConfig;
  headers?: KeyValuePair[];
  variables?: KeyValuePair[];
};

function mergeKVArrays(
  base: KeyValuePair[],
  override: KeyValuePair[],
): KeyValuePair[] {
  const overrideKeys = new Set(
    override
      .filter((h) => h.enabled !== false && h.key)
      .map((h) => h.key.toLowerCase()),
  );
  return [
    ...base.filter(
      (h) =>
        h.enabled !== false && h.key && !overrideKeys.has(h.key.toLowerCase()),
    ),
    ...override,
  ];
}

export function resolveInheritedConfig(
  collection?: Collection,
  folder?: Folder,
): InheritedConfig {
  const colCfg = collection?.config ?? {};
  const folCfg = folder?.config ?? {};

  let auth: AuthConfig | undefined;
  if (colCfg.auth && colCfg.auth.type !== "none") auth = colCfg.auth;
  if (folCfg.auth !== undefined) auth = folCfg.auth;

  const headers = mergeKVArrays(colCfg.headers ?? [], folCfg.headers ?? []);
  const variables = mergeKVArrays(
    colCfg.variables ?? [],
    folCfg.variables ?? [],
  );

  return {
    ...(auth ? { auth } : {}),
    ...(headers.length ? { headers } : {}),
    ...(variables.length ? { variables } : {}),
  };
}

function buildHeaders(
  headers: KeyValuePair[],
  auth: AuthConfig,
  env: Environment | null,
  scopeVars?: KeyValuePair[],
): Record<string, string> {
  const result: Record<string, string> = {};
  const rv = (s: string) => resolveVariables(s, env, scopeVars);

  headers.forEach((h) => {
    if (h.enabled && h.key) result[rv(h.key)] = rv(h.value);
  });

  if (auth.type === "bearer" && auth.token) {
    result["Authorization"] = `Bearer ${rv(auth.token)}`;
  } else if (auth.type === "basic" && auth.username) {
    result["Authorization"] =
      `Basic ${btoa(`${rv(auth.username)}:${rv(auth.password)}`)}`;
  } else if (auth.type === "apiKey" && auth.in === "header" && auth.key) {
    result[rv(auth.key)] = rv(auth.value);
  }

  return result;
}

function buildQueryString(
  url: string,
  params: KeyValuePair[],
  auth: AuthConfig,
  env: Environment | null,
  scopeVars?: KeyValuePair[],
): string {
  const rv = (s: string) => resolveVariables(s, env, scopeVars);
  const resolved = rv(url);
  const urlObj = new URL(
    resolved.startsWith("http") ? resolved : `http://${resolved}`,
  );

  params.forEach((p) => {
    if (p.enabled && p.key) urlObj.searchParams.append(rv(p.key), rv(p.value));
  });

  if (auth.type === "apiKey" && auth.in === "query" && auth.key) {
    urlObj.searchParams.append(rv(auth.key), rv(auth.value));
  }

  return urlObj.toString();
}

export function prepareProxyRequest(
  draft: ActiveTab["draft"],
  env: Environment | null,
  inherited?: InheritedConfig,
) {
  const scopeVars = inherited?.variables;

  const effectiveAuth =
    draft.auth.type !== "none"
      ? draft.auth
      : (inherited?.auth ?? { type: "none" as const });

  const effectiveHeaders = inherited?.headers
    ? mergeKVArrays(inherited.headers, draft.headers)
    : draft.headers;

  let baseUrl = draft.url;
  if (
    baseUrl &&
    !baseUrl.startsWith("http://") &&
    !baseUrl.startsWith("https://") &&
    !baseUrl.includes("{{")
  ) {
    baseUrl = "https://" + baseUrl;
  }

  const rv = (s: string) => resolveVariables(s, env, scopeVars);

  const url = buildQueryString(
    baseUrl,
    draft.queryParams,
    effectiveAuth,
    env,
    scopeVars,
  );
  const headers = buildHeaders(effectiveHeaders, effectiveAuth, env, scopeVars);

  let bodyContent: string | undefined;
  if (draft.body.type === "json" || draft.body.type === "raw") {
    bodyContent = rv(draft.body.content);
    if (
      draft.body.type === "json" &&
      !headers["Content-Type"] &&
      !headers["content-type"]
    ) {
      headers["Content-Type"] = "application/json";
    }
  } else if (draft.body.type === "form-urlencoded") {
    const p = new URLSearchParams();
    draft.body.pairs.forEach((pair) => {
      if (pair.enabled && pair.key) p.append(rv(pair.key), rv(pair.value));
    });
    bodyContent = p.toString();
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  } else if (draft.body.type === "form-data") {
    const obj: Record<string, string> = {};
    draft.body.pairs.forEach((pair) => {
      if (pair.enabled && pair.key) obj[rv(pair.key)] = rv(pair.value);
    });
    bodyContent = JSON.stringify(obj);
  }

  return {
    method: draft.method,
    url,
    headers,
    body: bodyContent ?? null,
  };
}
