import { useState, useEffect } from "react";

// Check if running inside Tauri environment at runtime
const isTauriEnv = (): boolean => {
  return (
    typeof window !== "undefined" &&
    ((window as any).__TAURI_IPC__ !== undefined ||
      (window as any).__TAURI_INTERNALS__ !== undefined ||
      (window as any).__TAURI__ !== undefined)
  );
};

export function useAppVersion(): string {
  const [version, setVersion] = useState<string>("0.1.1");

  useEffect(() => {
    if (isTauriEnv()) {
      // Dynamic import to prevent bundler/compilation errors in pure web environments
      import("@tauri-apps/api/app")
        .then((app) => app.getVersion())
        .then((ver) => setVersion(ver))
        .catch((err) => {
          console.error("[useAppVersion] Failed to read Tauri version:", err);
          const fallback = process.env.NEXT_PUBLIC_APP_VERSION;
          if (fallback) setVersion(fallback);
        });
    } else {
      const ver = process.env.NEXT_PUBLIC_APP_VERSION;
      if (ver) {
        setVersion(ver);
      }
    }
  }, []);

  return version;
}
