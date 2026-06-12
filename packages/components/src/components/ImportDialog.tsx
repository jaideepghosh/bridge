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

// Tree-like collection list preview component
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
    <div className="border border-border rounded-lg bg-card overflow-hidden flex flex-col h-full max-h-[300px] sm:max-h-[360px] shadow-sm animate-in fade-in-50 duration-200">
      <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between text-xs font-semibold">
        <span className="text-foreground font-medium truncate pr-4">
          {collection.name}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0 bg-muted px-2 py-0.5 rounded border">
          {collection.folders.length} Folder
          {collection.folders.length !== 1 ? "s" : ""} •{" "}
          {collection.requests.length} Request
          {collection.requests.length !== 1 ? "s" : ""}
        </span>
      </div>
      {collection.description && (
        <div className="px-4 py-2 bg-card border-b border-border text-xs text-muted-foreground italic truncate">
          {collection.description}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-xs select-none">
        {/* Folders */}
        {collection.folders.map((folder) => {
          const folderRequests = collection.requests.filter(
            (r) => r.folderId === folder.id,
          );
          const isExpanded = expandedFolders.has(folder.id);
          return (
            <div key={folder.id} className="space-y-1">
              <button
                className="w-full flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-muted/50 text-left font-medium text-foreground transition-colors cursor-pointer"
                onClick={() => toggleFolder(folder.id)}
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                />
                <FolderIcon className="h-4 w-4 text-amber-500 shrink-0 fill-amber-500/20" />
                <span className="truncate flex-1">{folder.name}</span>
                <span className="text-[10px] text-muted-foreground font-sans bg-muted/30 px-1.5 py-0.2 rounded">
                  {folderRequests.length}
                </span>
              </button>
              {isExpanded && (
                <div className="pl-3.5 border-l border-border/50 ml-3.5 space-y-1 animate-in slide-in-from-top-1 duration-100">
                  {folderRequests.length === 0 && (
                    <div className="text-[10px] text-muted-foreground italic px-2 py-0.5">
                      Empty folder
                    </div>
                  )}
                  {folderRequests.map((req, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/30 text-[11px] group transition-colors"
                    >
                      <Badge
                        className={`text-[9px] font-bold border-0 px-1 py-0.5 rounded-sm shrink-0 font-mono tracking-wider ${METHOD_COLORS[req.method] ?? ""}`}
                      >
                        {req.method}
                      </Badge>
                      <span className="truncate text-foreground/80 flex-1 font-sans font-medium">
                        {req.name}
                      </span>
                      <span
                        className="text-[10px] text-muted-foreground truncate max-w-[150px] sm:max-w-[280px]"
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

        {/* Root requests */}
        {rootRequests.length > 0 && (
          <div className="space-y-1 pt-1.5 border-t border-border/40 mt-1.5">
            {rootRequests.map((req, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/30 text-[11px] transition-colors"
              >
                <Badge
                  className={`text-[9px] font-bold border-0 px-1 py-0.5 rounded-sm shrink-0 font-mono tracking-wider ${METHOD_COLORS[req.method] ?? ""}`}
                >
                  {req.method}
                </Badge>
                <span className="truncate text-foreground/80 flex-1 font-sans font-medium">
                  {req.name}
                </span>
                <span
                  className="text-[10px] text-muted-foreground truncate max-w-[150px] sm:max-w-[280px]"
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
      if (text) setImportText(text);
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
      // It is a collection (OpenAPI or Postman)
      const importedCol = parsed.data;
      const collectionId = uuidv4();

      // 1. Save Collection
      const colVariables = importedCol.variables || [];
      const collection: Collection = {
        id: collectionId,
        name: importedCol.name || "Imported Collection",
        description: importedCol.description || "",
        config: {
          variables: colVariables,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveCollection(collection);

      // 2. Map folder IDs
      const folderIdMap = new Map<string, string>();
      for (const f of importedCol.folders) {
        const newFolderId = uuidv4();
        folderIdMap.set(f.id, newFolderId);
      }

      // 3. Save folders
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

      // 4. Save requests
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

  const handlePaste = useCallback(() => {
    navigator.clipboard
      .readText()
      .then((text) => {
        if (text.trim()) setImportText(text.trim());
      })
      .catch(() => {});
  }, []);

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
      return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    if (parsed.type === "request")
      return <FileCode className="h-4 w-4 text-sky-500" />;
    const isPostman =
      importText.includes('"info"') && importText.includes('"item"');
    if (isPostman) return <FileJson className="h-4 w-4 text-orange-500" />;
    return <FileText className="h-4 w-4 text-emerald-500" />;
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
        className="max-w-full sm:max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden gap-0 border-border bg-card shadow-2xl"
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

        {/* Drag & Drop Visual Overlay */}
        {isDragging && (
          <div
            className="absolute inset-0 bg-background/90 z-50 flex flex-col items-center justify-center p-6 border-4 border-dashed border-primary m-3 rounded-xl transition-all animate-in fade-in duration-150"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-14 w-14 text-primary mb-4 animate-bounce" />
            <h2 className="text-lg font-bold text-foreground">
              Drop File to Import
            </h2>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Drop JSON or YAML files here to automatically analyze and extract
              requests
            </p>
          </div>
        )}

        <DialogHeader
          className="px-5 pt-4 pb-3 shrink-0 border-b border-border bg-muted/20"
          onDragOver={handleDragOver}
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold tracking-tight text-foreground">
              Import Request / Collection
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={handlePaste}
              >
                Paste from Clipboard
              </Button>
              <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono border">
                {typeof navigator !== "undefined" &&
                navigator.platform?.includes("Mac")
                  ? "⌘↵"
                  : "Ctrl+↵"}{" "}
                to import
              </kbd>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste a cURL command or drop/select a Postman Collection JSON,
            OpenAPI JSON, or OpenAPI YAML spec.
          </p>
        </DialogHeader>

        <div
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
          onDragOver={handleDragOver}
        >
          {/* Editor block */}
          <div className="flex-1 min-h-[200px] border-b border-border relative">
            {!importText && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/50 m-4 rounded-xl bg-muted/5 pointer-events-none select-none">
                <Upload className="h-10 w-10 text-muted-foreground/40 mb-3 animate-pulse" />
                <h3 className="text-xs font-semibold text-foreground mb-1">
                  Drag & drop files here
                </h3>
                <p className="text-[11px] text-muted-foreground text-center max-w-[280px] mb-4 leading-relaxed">
                  Supports OpenAPI Specification (JSON/YAML), Swagger 2.0,
                  Postman Collection, or raw cURL scripts
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs pointer-events-auto shadow-sm cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
                <span className="text-[10px] text-muted-foreground/60 mt-3">
                  Or click in editor below to paste/type raw text.
                </span>
              </div>
            )}
            <MonacoEditor
              value={importText}
              onChange={(v) => setImportText(v ?? "")}
              language={getMonacoLanguage()}
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

          {/* Preview panel / parse statuses */}
          <div className="shrink-0 max-h-[50%] overflow-y-auto border-border">
            {parseError && (
              <div className="flex items-start gap-2.5 px-5 py-3.5 bg-destructive/5 border-b border-border/80">
                <AlertCircle className="h-4.5 w-4.5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-normal">
                  {parseError}
                </p>
              </div>
            )}

            {parsed && (
              <div className="px-5 py-3.5 space-y-3 border-b border-border/80 bg-muted/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Detected format:
                  </span>
                  <div className="flex items-center gap-1.5 bg-card border px-2 py-0.5 rounded shadow-sm text-xs font-medium text-foreground">
                    {getFormatIcon()}
                    <span>{getFormatLabel()}</span>
                  </div>
                </div>

                {parsed.type === "request" ? (
                  /* Single Request (cURL) preview */
                  <div className="space-y-3.5 animate-in fade-in-50 duration-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`text-[10px] font-mono font-bold border-0 px-2 py-0.5 rounded-sm ${METHOD_COLORS[parsed.data.method] ?? ""}`}
                      >
                        {parsed.data.method}
                      </Badge>
                      <span className="font-mono text-xs text-foreground break-all bg-muted/50 px-2 py-0.5 rounded border">
                        {parsed.data.url}
                      </span>
                    </div>

                    {envCandidates.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
                        <button
                          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setShowEnvPanel((p) => !p)}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="text-amber-500">
                              {envCandidates.length} environment variable
                              {envCandidates.length > 1 ? "s" : ""} detected
                            </span>
                            <span className="text-muted-foreground font-normal">
                              — click to{" "}
                              {showEnvPanel ? "collapse" : "configure"}
                            </span>
                          </span>
                          {showEnvPanel ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>

                        {showEnvPanel && (
                          <div className="px-4 pb-3.5 space-y-2 border-t pt-2.5 bg-muted/5 animate-in slide-in-from-top-1 duration-150">
                            <p className="text-xs text-muted-foreground mb-1 leading-relaxed">
                              Select variables to convert from inline values to{" "}
                              <span className="font-mono text-amber-500 font-medium">
                                {"{{VAR}}"}
                              </span>{" "}
                              tokens. They will be automatically added to your
                              active environment variables configuration.
                            </p>
                            {envCandidates.map((c) => (
                              <label
                                key={c.name}
                                className="flex items-center gap-2.5 cursor-pointer group py-0.5 select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={c.convert}
                                  onChange={() => toggleCandidate(c.name)}
                                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                />
                                <span className="font-mono text-xs text-amber-500">
                                  {c.raw}
                                </span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="font-mono text-xs text-foreground font-semibold">{`{{${c.name}}}`}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Collection Tree list preview */
                  <CollectionPreviewTree
                    collection={parsed.data as ImportedCollection}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 px-5 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {parsed ? (
              <span>Ready to import into workspace</span>
            ) : importText ? (
              <span className="text-destructive font-medium">
                Please fix the file structure or format to continue
              </span>
            ) : (
              <span>Upload a file or paste content to get started</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!parsed}
              className="gap-1.5 cursor-pointer"
            >
              Import{" "}
              {parsed
                ? parsed.type === "request"
                  ? "Request"
                  : "Collection"
                : "Content"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
