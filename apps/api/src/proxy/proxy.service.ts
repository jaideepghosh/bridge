import { Injectable, BadRequestException, RequestTimeoutException, BadGatewayException } from '@nestjs/common';
import { ExecuteRequestDto, ExecuteResponseDto } from './proxy.dto';

@Injectable()
export class ProxyService {
  async execute(dto: ExecuteRequestDto): Promise<ExecuteResponseDto> {
    const { method, url, headers = {}, body, timeoutMs } = dto;

    if (!url) throw new BadRequestException('url is required');
    if (!method) throw new BadRequestException('method is required');

    const timeout = timeoutMs ?? 30000;
    const start = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: headers as Record<string, string>,
        signal: controller.signal,
        redirect: 'follow',
      };

      if (body != null && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = body;
      }

      const response = await fetch(url, fetchOptions);
      const durationMs = Date.now() - start;

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseBody = await response.text();
      const size = Buffer.byteLength(responseBody, 'utf8');
      const contentType = response.headers.get('content-type') ?? null;

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        durationMs,
        size,
        contentType,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - start;

      if (err instanceof Error && err.name === 'AbortError') {
        throw new RequestTimeoutException({
          error: 'Request timed out',
          details: `Exceeded ${timeout}ms timeout`,
        });
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException({
        error: 'Proxy request failed',
        details: message,
        durationMs,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
