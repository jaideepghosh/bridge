import { Rainbow, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@bridge/ui";
import { AppVersion } from "./AppVersion";

export function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none font-medium"
          title="About Bridge"
        >
          <span>About</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm p-6 text-center select-none">
        <DialogHeader className="flex flex-col items-center space-y-2 mb-2">
          <div className="p-3.5 text-primary flex items-center justify-center">
            <Rainbow className="h-10 w-10 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Bridge
          </DialogTitle>
          <div className="flex items-center space-x-1.5 justify-center text-xs">
            <AppVersion />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Lightweight REST API testing and documentation workbench built for
            developers. Test local and remote APIs without CORS limits.
          </p>

          <div className="h-px bg-border/60 w-full" />

          <div className="space-y-1.5 text-[10px] text-muted-foreground font-medium">
            <div className="flex items-center justify-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>CORS Sandbox Disabled</span>
            </div>
            <div>Copyright © 2026 Jaideep Ghosh</div>
            <div className="text-[9px] text-muted-foreground/60">
              All rights reserved.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
