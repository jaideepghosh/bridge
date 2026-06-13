import { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "../context/app-store";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@bridge/ui";
import { MonacoEditor } from "./MonacoEditor";
import {
  parseImportContent,
  ImportResult,
  ImportedRequest,
  ImportedCollection,
} from "@bridge/importer";
import { Environment, Collection, Folder, SavedRequest } from "../types";
import { v4 as uuidv4 } from "uuid";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Folder as FolderIcon,
  Upload,
  FileCode,
  FileJson,
  FileText,
  HelpCircle,
  Terminal,
  Layers,
  Sparkles,
} from "lucide-react";

type EnvVarCandidate = {
  raw: string;
  name: string;
  convert: boolean;
};

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

function applyEnvConversions(
  parsed: ImportedRequest,
  candidates: EnvVarCandidate[],
): ImportedRequest {
  const toConvert = candidates.filter((c) => c.convert);
  if (toConvert.length === 0) return parsed;

  const replace = (s: string) =>
    toConvert.reduce((acc, c) => acc.split(c.raw).join(`{{${c.name}}}`), s);

  return {
    ...parsed,
    url: replace(parsed.url),
    headers: parsed.headers.map((h) => ({ ...h, value: replace(h.value) })),
    queryParams: parsed.queryParams.map((p) => ({
      ...p,
      value: replace(p.value),
    })),
    body:
      parsed.body.type === "json" || parsed.body.type === "raw"
        ? { ...parsed.body, content: replace(parsed.body.content) }
        : parsed.body,
    auth:
      parsed.auth.type === "bearer"
        ? { ...parsed.auth, token: replace(parsed.auth.token) }
        : parsed.auth.type === "basic"
          ? {
              ...parsed.auth,
              username: replace(parsed.auth.username),
              password: replace(parsed.auth.password),
            }
          : parsed.auth.type === "apiKey"
            ? { ...parsed.auth, value: replace(parsed.auth.value) }
            : parsed.auth,
  };
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25",
  POST: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
  PUT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25",
  PATCH:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/25",
  DELETE:
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/25",
  OPTIONS: "bg-muted text-muted-foreground ring-1 ring-border",
  HEAD: "bg-muted text-muted-foreground ring-1 ring-border",
};

type Props = {
  open: boolean;
  onClose: () => void;
};

// Source type tabs for the import panel
type SourceTab = "paste" | "file";

function CollectionPreviewTree({
  collection,
}: {
  collection: ImportedCollection;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(collection.folders.map((f) => f.id)),
  );

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rootRequests = collection.requests.filter((r) => !r.folderId);

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden flex flex-col h-full max-h-[300px] sm:max-h-[360px] animate-in fade-in-50 duration-200">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-foreground tracking-tight truncate pr-4">
            {collection.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded">
            {collection.folders.length}f · {collection.requests.length}r
          </span>
        </div>
      </div>
      {collection.description && (
        <div className="px-4 py-2 border-b border-border text-xs text-muted-foreground truncate bg-muted/10">
          {collection.description}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-px font-mono text-xs select-none">
        {collection.folders.map((folder) => {
          const folderRequests = collection.requests.filter(
            (r) => r.folderId === folder.id,
          );
          const isExpanded = expandedFolders.has(folder.id);
          return (
            <div key={folder.id} className="space-y-px">
              <button
                className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded hover:bg-muted text-left font-medium text-foreground transition-colors cursor-pointer"
                onClick={() => toggleFolder(folder.id)}
              >
                <ChevronDown
                  className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-150 ${isExpanded ? "" : "-rotate-90"}`}
                />
                <FolderIcon className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-500/20" />
                <span className="truncate flex-1 text-xs font-sans">
                  {folder.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-sans tabular-nums bg-muted px-1 rounded">
                  {folderRequests.length}
                </span>
              </button>
              {isExpanded && (
                <div className="pl-4 border-l border-border/60 ml-3.5 space-y-px animate-in slide-in-from-top-1 duration-100">
                  {folderRequests.length === 0 && (
                    <div className="text-xs text-muted-foreground italic px-2 py-1.5">
                      Empty folder
                    </div>
                  )}
                  {folderRequests.map((req, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/60 text-xs group transition-colors"
                    >
                      <Badge
                        className={`text-[9px] font-bold px-1.5 py-0 rounded-sm shrink-0 font-mono tracking-wider uppercase ${METHOD_COLORS[req.method] ?? ""}`}
                      >
                        {req.method}
                      </Badge>
                      <span className="truncate text-foreground flex-1 font-sans text-[11px]">
                        {req.name}
                      </span>
                      <span
                        className="text-[10px] text-muted-foreground/70 truncate max-w-[150px] sm:max-w-[280px] font-mono"
                        title={req.url}
                      >
                        {req.url}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {rootRequests.length > 0 && (
          <div className="space-y-px pt-1.5 border-t border-border mt-1.5">
            {rootRequests.map((req, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/60 text-xs transition-colors"
              >
                <Badge
                  className={`text-[9px] font-bold px-1.5 py-0 rounded-sm shrink-0 font-mono tracking-wider uppercase ${METHOD_COLORS[req.method] ?? ""}`}
                >
                  {req.method}
                </Badge>
                <span className="truncate text-foreground flex-1 font-sans text-[11px]">
                  {req.name}
                </span>
                <span
                  className="text-[10px] text-muted-foreground/70 truncate max-w-[150px] sm:max-w-[280px] font-mono"
                  title={req.url}
                >
                  {req.url}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ImportDialog({ open, onClose }: Props) {
  const {
    openTab,
    environments,
    activeEnvironmentId,
    saveEnvironment,
    saveCollection,
    saveFolder,
    saveRequest,
  } = useStore((s) => ({
    openTab: s.openTab,
    environments: s.environments,
    activeEnvironmentId: s.activeEnvironmentId,
    saveEnvironment: s.saveEnvironment,
    saveCollection: s.saveCollection,
    saveFolder: s.saveFolder,
    saveRequest: s.saveRequest,
  }));

  const [importText, setImportText] = useState("");
  const [parsed, setParsed] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [envCandidates, setEnvCandidates] = useState<EnvVarCandidate[]>([]);
  const [showEnvPanel, setShowEnvPanel] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<SourceTab>("paste");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = importText.trim();
    if (!trimmed) {
      setParsed(null);
      setParseError(null);
      setEnvCandidates([]);
      return;
    }

    const result = parseImportContent(trimmed);
    if (result) {
      setParsed(result);
      setParseError(null);
      if (result.type === "request") {
        const candidates = detectEnvCandidates(trimmed);
        setEnvCandidates(candidates);
        if (candidates.length > 0) setShowEnvPanel(true);
      } else {
        setEnvCandidates([]);
      }
    } else {
      setParsed(null);
      setEnvCandidates([]);
      if (trimmed.toLowerCase().startsWith("curl")) {
        setParseError(
          "Could not fully parse this cURL command. Check for unbalanced quotes or missing URL.",
        );
      } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        setParseError(
          "Could not parse JSON. Check syntax or ensure it matches Postman/OpenAPI format.",
        );
      } else {
        setParseError(
          "Unrecognized format. Paste a valid cURL command, OpenAPI JSON/YAML, or Postman Collection.",
        );
      }
    }
  }, [importText]);

  const toggleCandidate = (name: string) => {
    setEnvCandidates((prev) =>
      prev.map((c) => (c.name === name ? { ...c, convert: !c.convert } : c)),
    );
  };

  const handleFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setImportText(text);
        setActiveTab("paste");
      }
    };
    reader.readAsText(file);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleImport = useCallback(() => {
    if (!parsed) return;

    if (parsed.type === "request") {
      const parsedReq = parsed.data;
      let finalParsed = parsedReq;

      const toConvert = envCandidates.filter((c) => c.convert);
      if (toConvert.length > 0) {
        finalParsed = applyEnvConversions(parsedReq, envCandidates);

        const targetEnv: Environment | undefined =
          environments.find((e) => e.id === activeEnvironmentId) ??
          environments[0];

        if (targetEnv) {
          const existingKeys = new Set(targetEnv.variables.map((v) => v.key));
          const newVars = toConvert
            .filter((c) => !existingKeys.has(c.name))
            .map((c) => ({
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
        name: finalParsed.name,
        method: finalParsed.method,
        url: finalParsed.url,
        headers: finalParsed.headers,
        queryParams: finalParsed.queryParams,
        body: finalParsed.body,
        auth: finalParsed.auth,
        description: finalParsed.description || "",
      });
    } else {
      const importedCol = parsed.data;
      const collectionId = uuidv4();

      const colVariables = importedCol.variables || [];
      const collection: Collection = {
        id: collectionId,
        name: importedCol.name || "Imported Collection",
        description: importedCol.description || "",
        config: { variables: colVariables },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveCollection(collection);

      const folderIdMap = new Map<string, string>();
      for (const f of importedCol.folders) {
        const newFolderId = uuidv4();
        folderIdMap.set(f.id, newFolderId);
      }

      for (const f of importedCol.folders) {
        const folder: Folder = {
          id: folderIdMap.get(f.id)!,
          name: f.name,
          description: f.description || "",
          collectionId,
          parentFolderId: f.parentFolderId
            ? folderIdMap.get(f.parentFolderId)
            : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveFolder(folder);
      }

      for (const r of importedCol.requests) {
        const request: SavedRequest = {
          id: uuidv4(),
          name: r.name,
          method: r.method,
          url: r.url,
          description: r.description || "",
          operationId: r.operationId || "",
          headers: r.headers,
          queryParams: r.queryParams,
          pathParams: r.pathParams,
          body:
            r.body.type === "none"
              ? { type: "none" }
              : r.body.type === "json" || r.body.type === "raw"
                ? { type: r.body.type, content: r.body.content || "" }
                : { type: r.body.type, pairs: r.body.pairs || [] },
          auth: r.auth,
          collectionId,
          folderId: r.folderId ? folderIdMap.get(r.folderId) : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveRequest(request);
      }
    }

    setImportText("");
    setParsed(null);
    setEnvCandidates([]);
    onClose();
  }, [
    parsed,
    envCandidates,
    environments,
    activeEnvironmentId,
    saveEnvironment,
    saveCollection,
    saveFolder,
    saveRequest,
    openTab,
    onClose,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && parsed) {
        e.preventDefault();
        handleImport();
      }
    },
    [parsed, handleImport],
  );

  const getFormatLabel = () => {
    if (!parsed) return "";
    if (parsed.type === "request") return "cURL Command";
    const isYaml =
      !importText.trim().startsWith("{") && !importText.trim().startsWith("[");
    const isPostman =
      importText.includes('"info"') && importText.includes('"item"');
    if (isPostman) return "Postman Collection";
    return isYaml
      ? "OpenAPI Specification (YAML)"
      : "OpenAPI Specification (JSON)";
  };

  const getFormatIcon = () => {
    if (!parsed)
      return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    if (parsed.type === "request")
      return <FileCode className="h-3.5 w-3.5 text-sky-500" />;
    const isPostman =
      importText.includes('"info"') && importText.includes('"item"');
    if (isPostman) return <FileJson className="h-3.5 w-3.5 text-orange-500" />;
    return <FileText className="h-3.5 w-3.5 text-emerald-500" />;
  };

  const getMonacoLanguage = () => {
    const trimmed = importText.trim();
    if (!trimmed) return "shell";
    if (trimmed.toLowerCase().startsWith("curl")) return "shell";
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
    return "yaml";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-full sm:max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden gap-0 border-border bg-background"
        onKeyDown={handleKeyDown}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          accept=".json,.yaml,.yml,.txt"
          className="hidden"
        />

        {/* Drag & Drop Overlay */}
        {isDragging && (
          <div
            className="absolute inset-0 bg-background/98 z-50 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-primary/60 rounded-lg m-1 animate-in fade-in duration-150"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center border border-primary/20">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Drop to import
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JSON · YAML · .txt
              </p>
            </div>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DialogHeader
          className="shrink-0 border-b border-border"
          onDragOver={handleDragOver}
        >
          <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
                <Upload className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-foreground leading-none">
                  Import
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  cURL command · OpenAPI · Postman Collection
                </p>
              </div>
            </div>
          </div>

          {/* Source tabs */}
          <div className="flex items-center gap-0 px-5 -mb-px">
            <button
              onClick={() => setActiveTab("paste")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "paste"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Terminal className="h-3 w-3" />
              Paste / Type
            </button>
            <button
              onClick={() => setActiveTab("file")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "file"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3 w-3" />
              Upload file
            </button>
          </div>
        </DialogHeader>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
          onDragOver={handleDragOver}
        >
          {/* Editor / Upload panel */}
          <div className="flex-1 min-h-[200px] border-b border-border flex flex-col relative">
            {activeTab === "paste" ? (
              /* ── Paste tab ─────────────────────────── */
              importText ? (
                <div className="h-full w-full">
                  <MonacoEditor
                    value={importText}
                    onChange={(v) => setImportText(v ?? "")}
                    language={getMonacoLanguage()}
                    minimal
                    height="100%"
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
              ) : (
                <div
                  className="flex flex-col h-full w-full cursor-text"
                  onClick={() => {
                    /* focus monaco on click */
                  }}
                >
                  {/* Thin editor strip for real interaction */}
                  <div className="flex-1 relative">
                    <MonacoEditor
                      value={importText}
                      onChange={(v) => setImportText(v ?? "")}
                      language="shell"
                      minimal
                      height="100%"
                      options={{
                        lineNumbers: "off",
                        wordWrap: "on",
                        minimap: { enabled: false },
                        fontSize: 13,
                        padding: { top: 16, bottom: 8 },
                        scrollBeyondLastLine: false,
                        renderLineHighlight: "none",
                        overviewRulerLanes: 0,
                      }}
                    />
                    {!importText && (
                      <div className="absolute top-4 left-4 text-xs text-muted-foreground/40 pointer-events-none select-none font-mono">
                        Paste a cURL command, OpenAPI spec, or Postman JSON…
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              /* ── File tab ──────────────────────────── */
              <div
                className="flex-1 flex items-center justify-center p-8"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div
                  className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl max-w-md w-full gap-4 transition-colors ${
                    isDragging
                      ? "border-primary/60 bg-primary/4"
                      : "border-border hover:border-border/80 hover:bg-muted/30"
                  }`}
                >
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Drag & drop a file here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      OpenAPI JSON/YAML · Swagger 2.0 · Postman Collection
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium text-foreground bg-background hover:bg-muted border border-border rounded-md transition-colors cursor-pointer shadow-sm"
                  >
                    Browse files
                  </button>
                  <p className="text-[11px] text-muted-foreground/50">
                    .json · .yaml · .yml · .txt
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Parse result / Preview panel ─────────────────────────────── */}
          <div className="shrink-0 max-h-[50%] overflow-y-auto">
            {parseError && (
              <div className="flex items-start gap-3 px-5 py-3.5 bg-destructive/4 border-b border-border">
                <div className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                </div>
                <div>
                  <p className="text-xs font-medium text-destructive">
                    Parse error
                  </p>
                  <p className="text-xs text-destructive/80 mt-0.5 leading-relaxed">
                    {parseError}
                  </p>
                </div>
              </div>
            )}

            {parsed && (
              <div className="px-5 py-4 space-y-3.5 border-b border-border">
                {/* Detection badge row */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-medium">Recognized</span>
                  </div>
                  <div className="h-3.5 w-px bg-border" />
                  <div className="inline-flex items-center gap-1.5 border border-border bg-muted/40 px-2.5 py-1 rounded-md text-xs text-foreground">
                    {getFormatIcon()}
                    <span className="font-medium">{getFormatLabel()}</span>
                  </div>
                </div>

                {parsed.type === "request" ? (
                  <div className="space-y-3 animate-in fade-in-50 duration-200">
                    {/* Request preview pill */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`text-[9px] font-mono font-bold px-1.5 py-0 rounded-sm uppercase tracking-wider ${METHOD_COLORS[parsed.data.method] ?? ""}`}
                      >
                        {parsed.data.method}
                      </Badge>
                      <span className="font-mono text-xs text-foreground break-all bg-muted px-2 py-1 rounded border border-border/50">
                        {parsed.data.url}
                      </span>
                    </div>

                    {/* Env variable panel */}
                    {envCandidates.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setShowEnvPanel((p) => !p)}
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                            <span className="font-semibold text-foreground">
                              {envCandidates.length} environment variable
                              {envCandidates.length > 1 ? "s" : ""} detected
                            </span>
                            <span className="text-muted-foreground">
                              — {showEnvPanel ? "collapse" : "configure"}
                            </span>
                          </span>
                          {showEnvPanel ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>

                        {showEnvPanel && (
                          <div className="px-4 pb-4 space-y-2 border-t border-border pt-3 bg-muted/20 animate-in slide-in-from-top-1 duration-150">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Select variables to convert to{" "}
                              <span className="font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded">
                                {"{{VAR}}"}
                              </span>{" "}
                              tokens — added to your active environment
                              automatically.
                            </p>
                            {envCandidates.map((c) => (
                              <label
                                key={c.name}
                                className="flex items-center gap-2.5 cursor-pointer group py-1 select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={c.convert}
                                  onChange={() => toggleCandidate(c.name)}
                                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                />
                                <span className="font-mono text-xs text-amber-600 dark:text-amber-400">
                                  {c.raw}
                                </span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="font-mono text-xs text-foreground font-medium bg-muted px-1.5 py-0.5 rounded">{`{{${c.name}}}`}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <CollectionPreviewTree
                    collection={parsed.data as ImportedCollection}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 py-3 border-t border-border flex items-center justify-between gap-3 bg-muted/10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {parsed ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Ready to import into workspace</span>
              </>
            ) : importText ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                <span className="text-destructive">
                  Fix the format to continue
                </span>
              </>
            ) : (
              <span className="text-muted-foreground/60">
                Upload a file or paste content to get started
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!parsed}
              className="h-8 gap-1.5 text-xs cursor-pointer font-medium"
            >
              Import{" "}
              {parsed
                ? parsed.type === "request"
                  ? "request"
                  : "collection"
                : ""}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
