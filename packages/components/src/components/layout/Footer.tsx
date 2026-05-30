import { useState, useEffect } from "react";
import { CircleHelp, Wifi, WifiOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@payable-turborepo-starter/ui";
import { AboutDialog } from "../AboutDialog";
import { AppVersion } from "../AppVersion";

export function Footer() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const shortcuts = [
    { keys: ["⌘ + Enter", "Ctrl + Enter"], desc: "Send active request" },
    { keys: ["⌘ + S", "Ctrl + S"], desc: "Save active request" },
    { keys: ["⌘ + Shift + I", "Ctrl + Shift + I"], desc: "Import cURL command" },
    { keys: ["Double-click Tab"], desc: "Rename request tab" },
  ];

  return (
    <footer className="h-7 w-full border-t bg-card px-4 flex items-center justify-between text-[11px] text-muted-foreground select-none shrink-0">
      {/* Left side: Connection status */}
      <div className="flex items-center space-x-1.5 font-medium">
        <span className="relative flex h-2 w-2">
          {isOnline ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          ) : (
            <>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </>
          )}
        </span>
        {isOnline ? (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
            <Wifi className="h-3 w-3" />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1 text-rose-400 dark:text-rose-500">
            <WifiOff className="h-3 w-3" />
            Offline
          </span>
        )}
      </div>

      {/* Right side: About, Help icon & Version */}
      <div className="flex items-center space-x-3">
        <AboutDialog />
        
        <div className="h-3 w-px bg-border" />

        <Dialog>
          <DialogTrigger asChild>
            <button
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none"
              title="Keyboard Shortcuts & Help"
            >
              <span>Help</span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
                <CircleHelp className="h-4 w-4 text-primary" />
                Keyboard Shortcuts
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Improve your productivity with these built-in keyboard shortcuts and quick interactions:
              </p>
              <div className="border rounded-lg overflow-hidden bg-muted/20">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b bg-muted/50 text-[10px] uppercase font-semibold text-muted-foreground">
                      <th className="px-3 py-2 w-48">Shortcut</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {shortcuts.map((s, i) => (
                      <tr key={i} className="hover:bg-muted/10">
                        <td className="px-3 py-2 font-mono flex flex-wrap gap-1">
                          {s.keys.map((k, j) => (
                            <kbd
                              key={j}
                              className="px-1.5 py-0.5 rounded bg-muted border border-border/80 text-[10px] font-semibold text-foreground shadow-sm"
                            >
                              {k}
                            </kbd>
                          ))}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground font-medium">{s.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="h-3 w-px bg-border" />
        <AppVersion />
      </div>
    </footer>
  );
}
