import { useState, useEffect } from "react";
import { CircleHelp, Wifi, WifiOff, ExternalLink } from "lucide-react";
import { Badge, cn, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@bridge/ui";
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
    { keys: ["⌘ + T", "Ctrl + T"], desc: "Create and activate new tab" },
    { keys: ["⌘ + W", "Ctrl + W"], desc: "Close active tab (asks if dirty)" },
    { keys: ["⌥ + ⌘ + W", "Ctrl + Alt + W"], desc: "Force close active tab" },
    { keys: ["⌘ + Shift + T", "Ctrl + Shift + T"], desc: "Reopen last closed tab" },
    { keys: ["⌘ + Shift + ]", "Ctrl + Shift + ]"], desc: "Switch to next tab" },
    { keys: ["⌘ + Shift + [", "Ctrl + Shift + ["], desc: "Switch to previous tab" },
    { keys: ["⌘ + 1-8", "Ctrl + 1-8"], desc: "Go to tab position 1 to 8" },
    { keys: ["⌘ + 9", "Ctrl + 9"], desc: "Go to last tab" },
  ];

  return (
    <footer className="h-7 w-full border-t bg-card px-4 flex items-center justify-between text-[11px] text-muted-foreground select-none shrink-0">
      {/* Left side: Connection status */}
      <div className="flex items-center space-x-1.5 font-medium">
        <Badge variant="secondary" className="gap-2 rounded-full">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isOnline ? "bg-emerald-500" : "bg-red-500"
            )}
          />
          {isOnline ? "Connected" : "Offline"}
        </Badge>
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
          <DialogContent className="max-w-full sm:max-w-2xl">
            <DialogHeader>
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

              <div className="flex items-center justify-between pt-2 text-[10px] text-muted-foreground font-medium">
                <span>Have feedback or found a bug?</span>
                <a
                  href="https://github.com/jaideepghosh/bridge/issues/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer outline-none"
                >
                  <ExternalLink className="h-3 w-3" />
                  Report an Issue
                </a>
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
