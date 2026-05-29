import { createContext, useContext, type ReactNode } from "react";
import { ProxyRequestInput, ProxyResponse } from "../types";

export type ExecuteRequestFn = (req: ProxyRequestInput) => Promise<ProxyResponse>;

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
  if (!fn) throw new Error("useHttpExecutor must be used within HttpExecutorProvider");
  return fn;
}
