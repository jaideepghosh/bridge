import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { EnvironmentManager } from "../EnvironmentManager";
import { ImportDialog } from "../ImportDialog";
import { Moon, Sun, Download, Rainbow, Folder } from "lucide-react";
import { Button } from "@bridge/ui";
import { StorageDirectoryModal } from "../StorageDirectoryModal";
import { BrowserFileSystemStorageProvider } from "../../services/storage/browserFileSystem";

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const [showImport, setShowImport] = useState(false);
  const [workspaceDir, setWorkspaceDir] = useState<string | null>(null);
  const [showStorageModal, setShowStorageModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWorkspaceDir(localStorage.getItem("bridge_storage_directory"));
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "i") {
        e.preventDefault();
        setShowImport(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
      <div className="h-12 border-b flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center space-x-2 text-foreground font-semibold text-sm tracking-tight">
          <Rainbow className="h-5 w-5 text-primary" />
          <span>Bridge</span>

          {workspaceDir && (
            <>
              <span className="text-muted-foreground/30 font-light select-none">/</span>
              <button
                onClick={() => setShowStorageModal(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40 transition-all active:scale-95 cursor-pointer max-w-[150px] truncate"
                title={`Active Storage Workspace: ${workspaceDir} (Click to switch)`}
              >
                <Folder className="h-3 w-3 text-primary/70 shrink-0" />
                <span className="truncate">{workspaceName}</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 font-medium"
            onClick={() => setShowImport(true)}
            data-testid="button-import"
            title="Import cURL (Ctrl+Shift+I)"
          >
            <Download className="h-3.5 w-3.5" />
            Import
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <EnvironmentManager />

          <div className="h-4 w-px bg-border mx-1" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
      <StorageDirectoryModal
        open={showStorageModal}
        onClose={() => setShowStorageModal(false)}
        storage={new BrowserFileSystemStorageProvider()}
      />
    </>
  );
}
