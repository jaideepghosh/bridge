export class ExecuteRequestDto {
  method!: string;
  url!: string;
  headers?: Record<string, string>;
  body?: string | null;
  timeoutMs?: number;
}

export class ExecuteResponseDto {
  status!: number;
  statusText!: string;
  headers!: Record<string, string>;
  body!: string;
  durationMs!: number;
  size!: number;
  contentType!: string | null;
}
