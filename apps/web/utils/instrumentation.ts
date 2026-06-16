import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const exporter = new OTLPLogExporter({
      url: `${process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com"}/otlp/v1/logs`,
      headers: {
        Authorization: `Bearer ${process.env.POSTHOG_API_KEY ?? ""}`,
      },
    });

    const loggerProvider = new LoggerProvider({
      resource: resourceFromAttributes({
        "service.name": "my-nextjs-app",
      }),
    });

    loggerProvider.addLogRecordProcessor(
      new SimpleLogRecordProcessor(exporter),
    );

    // make the logger available globally
    (globalThis as any).__posthogLogger =
      loggerProvider.getLogger("my-nextjs-app");
  }
}
