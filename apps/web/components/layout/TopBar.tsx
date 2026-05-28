import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { EnvironmentManager } from "@/components/EnvironmentManager";
import { ImportDialog } from "@/components/ImportDialog";
import { Moon, Sun, Download, Rainbow } from "lucide-react";
import { Button } from "@payable-turborepo-starter/ui";

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const [showImport, setShowImport] = useState(false);

  // Global keyboard shortcut: Cmd/Ctrl + Shift + I
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

  return (
    <>
      <div className="h-12 border-b flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center space-x-2 text-foreground font-semibold text-sm tracking-tight">
          <Rainbow className="h-5 w-5 text-primary" />
          <span>Bridge</span>
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
    </>
  );
}
