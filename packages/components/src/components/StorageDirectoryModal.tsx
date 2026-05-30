import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label } from "@bridge/ui";
import { Folder, Sparkles, Database, ArrowRight, FolderOpen } from "lucide-react";
import { StorageProvider } from "../services/storage/types";
import { saveDirectoryHandle } from "../services/storage/indexedDb";

type Props = {
  open?: boolean;
  onClose?: () => void;
  forcePrompt?: boolean;
  storage: StorageProvider;
};

export function StorageDirectoryModal({ open, onClose, forcePrompt = false, storage }: Props) {
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Detect environment using both provider properties and comprehensive window inspections
    const tauri = !!storage.isNative || (typeof window !== "undefined" && (
      (window as any).__TAURI_IPC__ !== undefined ||
      (window as any).__TAURI_INTERNALS__ !== undefined ||
      (window as any).__TAURI__ !== undefined
    ));
    setIsTauriEnv(tauri);

    // Get current saved directory, or load default recommendation
    const currentSaved = typeof window !== "undefined" ? localStorage.getItem("bridge_storage_directory") : null;
    if (currentSaved) {
      setPath(currentSaved);
    } else if (storage.getDefaultDirectory) {
      setLoading(true);
      storage.getDefaultDirectory()
        .then((def) => {
          setPath(def);
        })
        .catch((err) => {
          console.error("[StorageDirectoryModal] Failed to get default directory:", err);
          setPath(tauri ? "/Users/username/Documents/Bridge" : "");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setPath(tauri ? "/Users/username/Documents/Bridge" : "");
    }
  }, [storage]);

  const handleSelectWebDirectory = async () => {
    setError(null);
    try {
      if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
        throw new Error("Your browser does not support the File System Access API. Please use a modern chromium-based browser (Chrome, Edge) to select folders directly.");
      }
      
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: "readwrite"
      });
      
      setLoading(true);
      await saveDirectoryHandle(dirHandle);
      localStorage.setItem("bridge_storage_directory", dirHandle.name);
      
      if (onClose) onClose();
      window.location.reload();
    } catch (err: any) {
      console.error("[StorageDirectoryModal] Directory selection failed:", err);
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to select directory");
      }
      setLoading(false);
    }
  };

  const handleSelectTauriDirectory = async () => {
    setError(null);
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: path || undefined
      });
      if (selected && typeof selected === "string") {
        setPath(selected);
      }
    } catch (err: any) {
      console.error("[StorageDirectoryModal] Tauri directory selection failed:", err);
      setError(err.message || "Failed to select directory");
    }
  };

  const handleSaveTauri = () => {
    if (!path.trim()) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("bridge_storage_directory", path.trim());
      if (onClose) onClose();
      window.location.reload();
    }
  };

  // If forcePrompt is true, it shouldn't close by clicking outside
  const handleOpenChange = (openState: boolean) => {
    if (forcePrompt) return; // Prevent closing
    if (!openState && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-6 overflow-hidden rounded-xl border border-border/80 bg-background/95 backdrop-blur-md shadow-2xl">
        <DialogHeader className="space-y-2.5 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
              Configure Workspace Storage
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bridge needs to know where to read and write your collections, folders, environment variables, and request histories.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Environment-specific explanation card */}
          <div className="flex gap-3 p-4 rounded-xl border border-primary/10 bg-primary/5 text-card-foreground">
            <div className="mt-0.5 text-primary">
              <Database className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-foreground">
                {isTauriEnv ? "Local Directory Mode" : "Native FileSystem Access"}
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isTauriEnv
                  ? "Select a local directory folder on your filesystem. Your REST client data will be persisted inside a single `bridge-data.json` file inside that folder."
                  : "Pick a directory directly on your device. Bridge will write a `bridge-data.json` directly to your local file system. Your data remains 100% private and yours."}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs leading-normal">
              {error}
            </div>
          )}

          {!isTauriEnv ? (
            /* Web Flow: Native Folder Selector */
            <div className="space-y-4 py-2 flex flex-col items-center">
              <div className="w-full space-y-2">
                <Label className="text-xs font-semibold text-foreground">Selected Local Folder</Label>
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-medium truncate">
                      {path || "No folder selected yet"}
                    </span>
                  </div>
                  {path && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                      Connected
                    </span>
                  )}
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSelectWebDirectory}
                disabled={loading}
                className="w-full h-11 flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer transition-all active:scale-95 shadow-md"
              >
                <FolderOpen className="h-4.5 w-4.5" />
                {path ? "Change Selected Folder" : "Select Local Folder"}
              </Button>
            </div>
          ) : (
            /* Tauri Desktop Flow: Selector + Input preview */
            <div className="space-y-4 py-2">
              <Button
                type="button"
                onClick={handleSelectTauriDirectory}
                disabled={loading}
                className="w-full h-11 flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer transition-all active:scale-95 shadow-md"
              >
                <FolderOpen className="h-4.5 w-4.5" />
                {path ? "Change Selected Folder" : "Select Storage Folder"}
              </Button>

              <div className="space-y-2">
                <Label htmlFor="storage-path" className="text-xs font-semibold tracking-tight text-foreground flex items-center justify-between">
                  <span>Folder Directory Path</span>
                  {loading && <span className="text-[10px] text-muted-foreground animate-pulse">Detecting...</span>}
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-muted-foreground/60">
                    <Folder className="h-4 w-4" />
                  </span>
                  <Input
                    id="storage-path"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/Users/username/Documents/Bridge"
                    className="pl-9 h-10 border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm font-medium tracking-normal"
                    disabled={loading}
                    onKeyDown={(e) => e.key === "Enter" && path.trim() && handleSaveTauri()}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Select a directory or enter an absolute path manually.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 flex items-center gap-2 pt-2 border-t shrink-0">
          {!forcePrompt && onClose && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={onClose}>
              Cancel
            </Button>
          )}
          {isTauriEnv && (
            <Button
              onClick={handleSaveTauri}
              disabled={!path.trim() || loading}
              size="sm"
              className="h-9 flex-1 gap-1.5 font-semibold text-xs transition-all shadow-md active:scale-95"
            >
              {forcePrompt ? "Initialize Folder" : "Switch Folder"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
