import { useAppVersion } from "../hooks/useAppVersion";

export function AppVersion() {
  const version = useAppVersion();
  if (!version) return null;
  return (
    <span className="font-mono text-muted-foreground/80 tracking-tight">
      v{version}
    </span>
  );
}
