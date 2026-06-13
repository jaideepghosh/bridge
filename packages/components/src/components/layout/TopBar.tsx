import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { EnvironmentManager } from "../EnvironmentManager";
import { Moon, Sun, Rainbow, Folder, Monitor } from "lucide-react";
import { StorageDirectoryModal } from "../StorageDirectoryModal";
import { BrowserFileSystemStorageProvider } from "../../services/storage/browserFileSystem";
import { Button } from "@bridge/ui";

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const [workspaceDir, setWorkspaceDir] = useState<string | null>(null);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [isWeb, setIsWeb] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWorkspaceDir(localStorage.getItem("bridge_storage_directory"));
      setIsWeb(
        !(window as any).__TAURI_IPC__ && !(window as any).__TAURI_INTERNALS__,
      );
    }
  }, []);

  const workspaceName = workspaceDir
    ? workspaceDir.includes("/")
      ? workspaceDir.split("/").pop() || workspaceDir
      : workspaceDir.includes("\\")
        ? workspaceDir.split("\\").pop() || workspaceDir
        : workspaceDir
    : "";

  return (
    <>
      <div className="h-11 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
        {/* ── Left: logo + workspace ── */}
        <div className="flex items-center gap-2.5 text-foreground">
          <div className="flex items-center gap-2 font-semibold text-sm tracking-tight select-none">
            <Rainbow className="h-4 w-4 text-primary shrink-0" />
            <span>Bridge</span>
          </div>

          {workspaceDir && (
            <>
              <span className="text-muted-foreground/25 select-none text-xs">
                /
              </span>
              <button
                onClick={() => setShowStorageModal(true)}
                title={`Workspace: ${workspaceDir} — click to switch`}
                className="flex items-center gap-1.5 h-6 px-2 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50 transition-colors cursor-pointer max-w-[160px]"
              >
                <Folder className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                <span className="truncate">{workspaceName}</span>
              </button>
            </>
          )}
        </div>

        {/* ── Right: actions ── */}
        <div className="flex items-center gap-1.5">
          {/* Open in Desktop — only shown in web context */}
          {isWeb && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const currentPath = window.location.pathname.replace(
                  /^\/+/,
                  "",
                );
                const deepLinkUrl = `bridge://${currentPath}${window.location.search}`;
                window.location.href = deepLinkUrl;
              }}
              title="Open in the Bridge desktop app"
            >
              <Monitor className="h-3.5 w-3.5 shrink-0" />
              Open in Desktop
            </Button>
          )}

          <div className="w-px h-4 bg-border mx-0.5 shrink-0" />

          {/* Environment manager */}
          <EnvironmentManager />

          <div className="w-px h-4 bg-border mx-0.5 shrink-0" />

          {/* Theme toggle */}
          <Button
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <StorageDirectoryModal
        open={showStorageModal}
        onClose={() => setShowStorageModal(false)}
        storage={new BrowserFileSystemStorageProvider()}
      />
    </>
  );
}
