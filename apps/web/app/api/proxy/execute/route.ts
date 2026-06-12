import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ExecuteRequestBody = z.object({
  method: z.string(),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  timeoutMs: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json();

  const parsed = ExecuteRequestBody.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: parsed.error.message,
      },
      { status: 400 },
    );
  }

  const { method, url, headers = {}, body, timeoutMs } = parsed.data;

  const timeout = timeoutMs ?? 30000;
  const start = Date.now();

  const controller = new AbortController();

  if (req.signal) {
    if (req.signal.aborted) {
      controller.abort();
    } else {
      req.signal.addEventListener("abort", () => {
        controller.abort();
      });
    }
  }

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
      redirect: "follow",
    };

    if (body != null && method !== "GET" && method !== "HEAD") {
      fetchOptions.body =
        typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    const resHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower === "content-encoding" ||
        lower === "transfer-encoding" ||
        lower === "connection" ||
        lower === "keep-alive" ||
        lower === "content-length"
      ) {
        return;
      }
      resHeaders.set(key, value);
    });

    resHeaders.set("Connection", "keep-alive");
    resHeaders.set("Cache-Control", "no-cache, no-transform");
    resHeaders.set("X-Accel-Buffering", "no");

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    const durationMs = Date.now() - start;

    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        {
          error: "Request timed out",
          details: `Exceeded ${timeout}ms timeout`,
        },
        { status: 408 },
      );
    }

    const message = err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      {
        error: "Proxy request failed",
        details: message,
        durationMs,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
