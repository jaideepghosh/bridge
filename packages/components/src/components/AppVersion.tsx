import { useAppVersion } from "../hooks/useAppVersion";

export function AppVersion() {
  const version = useAppVersion();
  return (
    <span className="font-mono text-muted-foreground/80 tracking-tight">
      v{version}
    </span>
  );
}
