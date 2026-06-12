import { createContext, useContext, type ReactNode } from "react";
import { ProxyRequestInput, ProxyResponse } from "../types";

export type ExecuteRequestOptions = {
  onHeaders?: (
    status: number,
    statusText: string,
    headers: Record<string, string>,
  ) => void;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
};

export type ExecuteRequestFn = (
  req: ProxyRequestInput,
  options?: ExecuteRequestOptions,
) => Promise<ProxyResponse>;

const HttpExecutorContext = createContext<ExecuteRequestFn | null>(null);

export function HttpExecutorProvider({
  execute,
  children,
}: {
  execute: ExecuteRequestFn;
  children: ReactNode;
}) {
  return (
    <HttpExecutorContext.Provider value={execute}>
      {children}
    </HttpExecutorContext.Provider>
  );
}

export function useHttpExecutor(): ExecuteRequestFn {
  const fn = useContext(HttpExecutorContext);
  if (!fn)
    throw new Error("useHttpExecutor must be used within HttpExecutorProvider");
  return fn;
}
