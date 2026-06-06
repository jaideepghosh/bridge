import { useState, useEffect } from "react";

const isTauri = (): boolean =>
  typeof window !== "undefined" &&
  ((window as any).__TAURI_IPC__ !== undefined ||
    (window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI__ !== undefined);

export function useAppVersion(): string {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    if (isTauri()) {
      import("@tauri-apps/api/app")
        .then((app) => app.getVersion())
        .then((ver) => setVersion(ver))
        .catch(() => {});
    } else {
      fetch("https://api.github.com/repos/jaideepghosh/bridge/releases/latest")
        .then((r) => r.json())
        .then((data) => {
          const tag: string = data.tag_name ?? "";
          setVersion(tag.replace(/^v/, ""));
        })
        .catch(() => {});
    }
  }, []);

  return version;
}
