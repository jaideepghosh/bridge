import { Environment, KeyValuePair } from "../types";

export function resolveVariables(
  input: string,
  env: Environment | null,
  scopeVars?: KeyValuePair[],
): string {
  if (!input || typeof input !== "string") return input;

  return input.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    if (env) {
      const variable = env.variables.find(
        (v) => v.key === varName && v.enabled,
      );
      if (variable) return variable.currentValue;
    }
    if (scopeVars) {
      const sv = scopeVars.find(
        (v) => v.key === varName && v.enabled !== false,
      );
      if (sv) return sv.value;
    }
    return match;
  });
}
