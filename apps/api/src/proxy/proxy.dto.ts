export interface ExecuteRequestDto {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
  timeoutMs?: number;
}

export interface ExecuteResponseDto {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
  size: number;
  contentType: string | null;
}
