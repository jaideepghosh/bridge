import { Exporter } from "./types";
import { BridgeExporter } from "./bridge";
import { PostmanExporter } from "./postman";
import { OpenApiExporter } from "./openapi";

export * from "./types";
export * from "./bridge";
export * from "./postman";
export * from "./openapi";

export const EXPORTERS: Record<string, Exporter> = {
  "bridge-json": new BridgeExporter(),
  "postman-json": new PostmanExporter(),
  "openapi-json": new OpenApiExporter(),
};

export function getExporter(id: string = "openapi-json"): Exporter {
  const exporter = EXPORTERS[id];
  if (!exporter) {
    throw new Error(`Exporter not found: ${id}`);
  }
  return exporter;
}
