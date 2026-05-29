import { useState, useEffect, useCallback } from "react";
import { useStore } from "../context/app-store";
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@payable-turborepo-starter/ui";
import { MonacoEditor } from "./MonacoEditor";
import { parseCurl, ParsedCurl } from "../utils/curl-parser";
import { Environment } from "../types";
import { v4 as uuidv4 } from "uuid";
import { ArrowRight, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

type EnvVarCandidate = {
  raw: string;
  name: string;
  convert: boolean;
};

const SAMPLE_CURL = `curl --request POST \\
  --url https://api.example.com/users \\
  --header 'Authorization: Bearer token123' \\
  --header 'Content-Type: application/json' \\
  --data '{
    "name": "John"
  }'`;

function detectEnvCandidates(curl: string): EnvVarCandidate[] {
  const seen = new Set<string>();
  const candidates: EnvVarCandidate[] = [];
  const re = /\$\{([A-Z_][A-Z0-9_]*)\}|\$([A-Z_][A-Z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(curl)) !== null) {
    const name = m[1] ?? m[2];
    const raw = m[0];
    if (name && !seen.has(name)) {
      seen.add(name);
      candidates.push({ raw, name, convert: true });
    }
  }
  return candidates;
}

function applyEnvConversions(parsed: ParsedCurl, candidates: EnvVarCandidate[]): ParsedCurl {
  const toConvert = candidates.filter(c => c.convert);
  if (toConvert.length === 0) return parsed;

  const replace = (s: string) =>
    toConvert.reduce((acc, c) => acc.split(c.raw).join(`{{${c.name}}}`), s);

  return {
    ...parsed,
    url: replace(parsed.url),
    headers: parsed.headers.map(h => ({ ...h, value: replace(h.value) })),
    queryParams: parsed.queryParams.map(p => ({ ...p, value: replace(p.value) })),
    body:
      parsed.body.type === "json" || parsed.body.type === "raw"
        ? { ...parsed.body, content: replace(parsed.body.content) }
        : parsed.body,
    auth:
      parsed.auth.type === "bearer"
        ? { ...parsed.auth, token: replace(parsed.auth.token) }
        : parsed.auth.type === "basic"
        ? { ...parsed.auth, username: replace(parsed.auth.username), password: replace(parsed.auth.password) }
        : parsed.auth.type === "apiKey"
        ? { ...parsed.auth, value: replace(parsed.auth.value) }
        : parsed.auth,
  };
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-500",
  POST: "bg-blue-500/15 text-blue-500",
  PUT: "bg-amber-500/15 text-amber-500",
  PATCH: "bg-violet-500/15 text-violet-500",
  DELETE: "bg-rose-500/15 text-rose-500",
  OPTIONS: "bg-slate-500/15 text-slate-400",
  HEAD: "bg-slate-500/15 text-slate-400",
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ImportDialog({ open, onClose }: Props) {
  const { openTab, environments, activeEnvironmentId, saveEnvironment } = useStore(s => ({
    openTab: s.openTab,
    environments: s.environments,
    activeEnvironmentId: s.activeEnvironmentId,
    saveEnvironment: s.saveEnvironment,
  }));
  const [curlText, setCurlText] = useState("");
  const [parsed, setParsed] = useState<ParsedCurl | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [envCandidates, setEnvCandidates] = useState<EnvVarCandidate[]>([]);
  const [showEnvPanel, setShowEnvPanel] = useState(false);

  useEffect(() => {
    const trimmed = curlText.trim();
    if (!trimmed) {
      setParsed(null);
      setParseError(null);
      setEnvCandidates([]);
      return;
    }

    const result = parseCurl(trimmed);
    if (result) {
      setParsed(result);
      setParseError(null);
      const candidates = detectEnvCandidates(trimmed);
      setEnvCandidates(candidates);
      if (candidates.length > 0) setShowEnvPanel(true);
    } else {
      setParsed(null);
      setParseError(
        trimmed.toLowerCase().startsWith("curl")
          ? "Could not fully parse this cURL command. Check for unbalanced quotes or missing URL."
          : "Input does not look like a cURL command. Make sure it starts with `curl`."
      );
      setEnvCandidates([]);
    }
  }, [curlText]);

  const toggleCandidate = (name: string) => {
    setEnvCandidates(prev =>
      prev.map(c => (c.name === name ? { ...c, convert: !c.convert } : c))
    );
  };

  const handleImport = useCallback(() => {
    if (!parsed) return;

    let finalParsed = parsed;

    const toConvert = envCandidates.filter(c => c.convert);
    if (toConvert.length > 0) {
      finalParsed = applyEnvConversions(parsed, envCandidates);

      const targetEnv: Environment | undefined =
        environments.find(e => e.id === activeEnvironmentId) ?? environments[0];

      if (targetEnv) {
        const existingKeys = new Set(targetEnv.variables.map(v => v.key));
        const newVars = toConvert
          .filter(c => !existingKeys.has(c.name))
          .map(c => ({
            id: uuidv4(),
            key: c.name,
            initialValue: "",
            currentValue: "",
            enabled: true,
            isSecret: false,
          }));

        if (newVars.length > 0) {
          saveEnvironment({
            ...targetEnv,
            variables: [...targetEnv.variables, ...newVars],
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    openTab(undefined, {
      name: `Imported: ${finalParsed.method} ${finalParsed.url.replace(/^https?:\/\//, "").split("?")[0]?.slice(0, 40) || ""}`,
      method: finalParsed.method,
      url: finalParsed.url,
      headers: finalParsed.headers,
      queryParams: finalParsed.queryParams,
      body: finalParsed.body,
      auth: finalParsed.auth,
    });

    setCurlText("");
    setParsed(null);
    setEnvCandidates([]);
    onClose();
  }, [parsed, envCandidates, environments, activeEnvironmentId, saveEnvironment, openTab, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && parsed) {
        e.preventDefault();
        handleImport();
      }
    },
    [parsed, handleImport]
  );

  const handlePaste = useCallback(() => {
    navigator.clipboard.readText().then(text => {
      if (text.trim()) setCurlText(text.trim());
    }).catch(() => {});
  }, []);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden gap-0"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">Import cURL</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={handlePaste}>
                Paste from clipboard
              </Button>
              <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                {typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "⌘↵" : "Ctrl+↵"} to import
              </kbd>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste a cURL command below. Query params, headers, auth, and body are extracted automatically.
          </p>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 border-b relative">
            {!curlText && (
              <div className="absolute inset-0 flex items-start px-14 pt-3 pointer-events-none z-10">
                <span className="font-mono text-sm text-muted-foreground/40 whitespace-pre leading-relaxed">
                  {SAMPLE_CURL}
                </span>
              </div>
            )}
            <MonacoEditor
              value={curlText}
              onChange={v => setCurlText(v ?? "")}
              language="shell"
              minimal
              options={{
                lineNumbers: "off",
                wordWrap: "on",
                minimap: { enabled: false },
                fontSize: 13,
                padding: { top: 12, bottom: 12 },
                scrollBeyondLastLine: false,
                renderLineHighlight: "none",
                overviewRulerLanes: 0,
              }}
            />
          </div>

          <div className="shrink-0 max-h-[40%] overflow-y-auto">
            {parseError && (
              <div className="flex items-start gap-2 px-5 py-3 bg-destructive/5 border-b">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{parseError}</p>
              </div>
            )}

            {parsed && (
              <div className="px-5 py-3 space-y-3 border-b bg-muted/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Parsed successfully</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className={`text-[10px] font-mono font-bold border-0 px-1.5 ${METHOD_COLORS[parsed.method] ?? ""}`}>
                      {parsed.method}
                    </Badge>
                    <span className="font-mono text-xs text-foreground break-all">{parsed.url}</span>
                  </div>
                </div>

                {envCandidates.length > 0 && (
                  <div className="border rounded-md overflow-hidden bg-card">
                    <button
                      className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium hover:bg-muted/30 transition-colors"
                      onClick={() => setShowEnvPanel(p => !p)}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-amber-500 font-semibold">
                          {envCandidates.length} possible environment variable{envCandidates.length > 1 ? "s" : ""} detected
                        </span>
                        <span className="text-muted-foreground">— click to {showEnvPanel ? "collapse" : "configure"}</span>
                      </span>
                      {showEnvPanel ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>

                    {showEnvPanel && (
                      <div className="px-5 pb-3 space-y-1.5">
                        <p className="text-xs text-muted-foreground mb-2">
                          Select variables to convert from inline values to <span className="font-mono text-amber-400">{"{{VAR}}"}</span> tokens.
                          They'll be added to your active environment.
                        </p>
                        {envCandidates.map(c => (
                          <label key={c.name} className="flex items-center gap-2.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={c.convert}
                              onChange={() => toggleCandidate(c.name)}
                              className="rounded"
                            />
                            <span className="font-mono text-xs text-amber-400">{c.raw}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-mono text-xs text-foreground">{`{{${c.name}}}`}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t bg-card flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {parsed ? (
              <span>Ready to import as a new request tab</span>
            ) : curlText ? (
              <span className="text-destructive">Fix the cURL command to continue</span>
            ) : (
              <span>Paste a cURL command above to get started</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleImport} disabled={!parsed} className="gap-1.5">
              Import Request
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
