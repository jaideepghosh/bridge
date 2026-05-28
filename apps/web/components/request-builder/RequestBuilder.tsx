import { useState, useRef, useCallback, useEffect } from "react";
import { useStore } from "@/store";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger } from "@payable-turborepo-starter/ui";
import { Plus, X, Play, Save } from "lucide-react";
import { HttpMethod, KeyValuePair } from "@/types";
import { useExecuteRequest } from "@/api-client-react";
import { prepareProxyRequest, resolveInheritedConfig } from "@/services/http-client";
import { MonacoEditor } from "../MonacoEditor";
import { UrlInput } from "./UrlInput";
import { SaveRequestDialog } from "./SaveRequestDialog";
import { v4 as uuidv4 } from "uuid";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-500",
  POST: "text-blue-500",
  PUT: "text-amber-500",
  PATCH: "text-violet-500",
  DELETE: "text-rose-500",
  OPTIONS: "text-slate-500",
  HEAD: "text-slate-500",
};

export function RequestBuilder() {
  const {
    activeTabs, selectedTabId, selectTab, closeTab, openTab,
    updateTabDraft, setTabResponse, environments, activeEnvironmentId,
    collections, folders, requests,
  } = useStore();
  const executeMutation = useExecuteRequest();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  // Inline tab rename
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const startRename = useCallback((tabId: string, currentName: string) => {
    setRenamingTabId(tabId);
    setRenameValue(currentName);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingTabId && renameValue.trim()) {
      updateTabDraft(renamingTabId, { name: renameValue.trim() });
    }
    setRenamingTabId(null);
  }, [renamingTabId, renameValue, updateTabDraft]);

  // Refs so keyboard shortcuts always call the latest handlers without stale closures
  const handleSendRef = useRef<() => void>(() => {});
  const handleSaveRef = useRef<() => void>(() => {});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      // Don't intercept if focus is inside a Monaco editor iframe
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "s") { e.preventDefault(); handleSaveRef.current(); }
      if (e.key === "Enter") { e.preventDefault(); handleSendRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeTab = activeTabs.find(t => t.id === selectedTabId);
  const activeEnv = environments.find(e => e.id === activeEnvironmentId) || null;

  if (!activeTab) return <div className="h-full flex items-center justify-center text-muted-foreground">No open tabs</div>;

  const { draft } = activeTab;

  const handleSend = async () => {
    if (!draft.url) return;
    setTabResponse(activeTab.id, null, true);
    const startTime = Date.now();
    try {
      const savedReq = requests.find(r => r.id === activeTab.requestId);
      const collection = savedReq ? collections.find(c => c.id === savedReq.collectionId) : undefined;
      const folder = savedReq?.folderId ? folders.find(f => f.id === savedReq.folderId) : undefined;
      const inherited = resolveInheritedConfig(collection, folder);
      const proxyReq = prepareProxyRequest(draft, activeEnv, inherited);
      const res = await executeMutation.mutateAsync({ data: proxyReq });
      setTabResponse(activeTab.id, res, false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to execute request";
      setTabResponse(activeTab.id, {
        status: 0,
        statusText: "Error",
        headers: {},
        body: message,
        durationMs: Date.now() - startTime,
        size: 0
      }, false);
    }
  };

  const updateDraft = (updates: Partial<typeof draft>) => updateTabDraft(activeTab.id, updates);

  // Wire refs so keyboard shortcuts always use the current handlers
  handleSendRef.current = handleSend;
  handleSaveRef.current = () => setShowSaveDialog(true);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Tab Bar */}
      <div className="flex bg-muted/30 border-b overflow-x-auto no-scrollbar shrink-0">
        {activeTabs.map(tab => {
          const isRenaming = renamingTabId === tab.id;
          return (
            <div
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center min-w-[120px] max-w-[220px] h-9 px-3 border-r cursor-pointer text-xs transition-colors ${
                tab.id === selectedTabId ? "bg-background border-t-2 border-t-primary" : "hover:bg-muted"
              }`}
              onClick={() => !isRenaming && selectTab(tab.id)}
            >
              <span className={`font-bold mr-2 text-[10px] shrink-0 ${METHOD_COLORS[tab.draft.method] ?? METHOD_COLORS.GET}`}>
                {tab.draft.method}
              </span>

              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingTabId(null);
                    e.stopPropagation();
                  }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-background border border-primary/50 rounded px-1 py-0 text-xs font-medium outline-none"
                  autoFocus
                />
              ) : (
                <span
                  className="truncate flex-1 font-medium"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    selectTab(tab.id);
                    startRename(tab.id, tab.draft.name);
                  }}
                  title="Double-click to rename"
                >
                  {tab.draft.name}
                </span>
              )}

              {tab.isDirty && !isRenaming && (
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mx-1 shrink-0" title="Unsaved changes" />
              )}
              <button
                className="ml-1 text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100 p-0.5 rounded shrink-0"
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        <button
          data-testid="button-new-tab"
          className="px-3 hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground"
          onClick={() => openTab()}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* URL Bar */}
      <div className="p-3 border-b flex gap-2 shrink-0 items-center">
        <Select value={draft.method} onValueChange={(v: HttpMethod) => updateDraft({ method: v })}>
          <SelectTrigger
            data-testid="select-method"
            className={`w-[100px] font-mono font-bold text-xs h-9 bg-muted/50 border-0 focus:ring-1 ${METHOD_COLORS[draft.method] ?? ""}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map(m => (
              <SelectItem key={m} value={m} className={`font-mono text-xs font-bold ${METHOD_COLORS[m]}`}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <UrlInput
          value={draft.url}
          onChange={(v) => updateDraft({ url: v })}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          env={activeEnv}
          placeholder="https://api.example.com/v1/users or paste a cURL command"
        />

        <Button
          data-testid="button-send"
          onClick={handleSend}
          disabled={activeTab.isLoading}
          className="h-9 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide shrink-0"
        >
          {activeTab.isLoading ? "Sending..." : "Send"}
          <Play className="h-3 w-3 ml-2" fill="currentColor" />
        </Button>

        <Button
          data-testid="button-save"
          variant="outline"
          className="h-9 px-3 border-dashed shrink-0"
          onClick={() => setShowSaveDialog(true)}
          title="Save request"
        >
          <Save className="h-4 w-4" />
        </Button>

      </div>

      {/* Request Settings Tabs */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs defaultValue="params" className="w-full h-full flex flex-col">
          <div className="px-3 border-b shrink-0">
            <TabsList className="bg-transparent h-10 p-0 space-x-6">
              <TabsTrigger value="params" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-2 text-xs">Params</TabsTrigger>
              <TabsTrigger value="headers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-2 text-xs">Headers</TabsTrigger>
              <TabsTrigger value="auth" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-2 text-xs">Auth</TabsTrigger>
              <TabsTrigger value="body" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-2 text-xs">Body</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="params" className="p-4 m-0 h-full border-0">
              <KeyValueTable items={draft.queryParams} onChange={(items) => updateDraft({ queryParams: items })} placeholderKey="Query Parameter" />
            </TabsContent>
            <TabsContent value="headers" className="p-4 m-0 h-full border-0">
              <KeyValueTable items={draft.headers} onChange={(items) => updateDraft({ headers: items })} placeholderKey="Header" />
            </TabsContent>
            <TabsContent value="auth" className="p-4 m-0 h-full border-0">
              <div className="max-w-md space-y-4">
                <Select
                  value={draft.auth.type}
                  onValueChange={(v: "none" | "bearer" | "basic" | "apiKey") => {
                    if (v === "none") updateDraft({ auth: { type: "none" } });
                    else if (v === "bearer") updateDraft({ auth: { type: "bearer", token: "" } });
                    else if (v === "basic") updateDraft({ auth: { type: "basic", username: "", password: "" } });
                    else updateDraft({ auth: { type: "apiKey", key: "X-API-Key", value: "", in: "header" } });
                  }}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Auth Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Auth</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="apiKey">API Key</SelectItem>
                  </SelectContent>
                </Select>

                {draft.auth.type === "bearer" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Token</label>
                    <Input
                      value={draft.auth.token}
                      onChange={(e) => updateDraft({ auth: { type: "bearer", token: e.target.value } })}
                      className="font-mono text-sm"
                      placeholder="eyJ..."
                    />
                  </div>
                )}
                {draft.auth.type === "basic" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Username</label>
                      <Input
                        value={draft.auth.username}
                        onChange={(e) => updateDraft({ auth: { type: "basic", username: e.target.value, password: (draft.auth as { type: "basic"; username: string; password: string }).password } })}
                        className="font-mono text-sm mt-1"
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Password</label>
                      <Input
                        type="password"
                        value={draft.auth.password}
                        onChange={(e) => updateDraft({ auth: { type: "basic", username: (draft.auth as { type: "basic"; username: string; password: string }).username, password: e.target.value } })}
                        className="font-mono text-sm mt-1"
                        placeholder="password"
                      />
                    </div>
                  </div>
                )}
                {draft.auth.type === "apiKey" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Key Name</label>
                      <Input
                        value={draft.auth.key}
                        onChange={(e) => { const a = draft.auth as { type: "apiKey"; key: string; value: string; in: "header" | "query" }; updateDraft({ auth: { type: "apiKey", key: e.target.value, value: a.value, in: a.in } }); }}
                        className="font-mono text-sm mt-1"
                        placeholder="X-API-Key"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Value</label>
                      <Input
                        value={draft.auth.value}
                        onChange={(e) => { const a = draft.auth as { type: "apiKey"; key: string; value: string; in: "header" | "query" }; updateDraft({ auth: { type: "apiKey", key: a.key, value: e.target.value, in: a.in } }); }}
                        className="font-mono text-sm mt-1"
                        placeholder="api_key_value"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Add to</label>
                      <Select
                        value={draft.auth.in}
                        onValueChange={(v: "header" | "query") => { const a = draft.auth as { type: "apiKey"; key: string; value: string; in: "header" | "query" }; updateDraft({ auth: { type: "apiKey", key: a.key, value: a.value, in: v } }); }}
                      >
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">Header</SelectItem>
                          <SelectItem value="query">Query Param</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="body" className="p-0 m-0 h-full border-0 flex flex-col">
              <div className="p-2 border-b shrink-0 flex items-center gap-2">
                <Select
                  value={draft.body.type}
                  onValueChange={(v: "none" | "json" | "raw" | "form-urlencoded" | "form-data") =>
                    updateDraft({ body: v === "none" ? { type: "none" } : v === "json" ? { type: "json", content: "" } : v === "raw" ? { type: "raw", content: "" } : { type: v, pairs: [] } })
                  }
                >
                  <SelectTrigger className="w-[160px] h-8 text-xs border-dashed">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Body</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="raw">Raw</SelectItem>
                    <SelectItem value="form-urlencoded">Form URL-Encoded</SelectItem>
                    <SelectItem value="form-data">Form Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-h-0 relative">
                {(draft.body.type === "json" || draft.body.type === "raw") ? (
                  <MonacoEditor
                    value={draft.body.content || ""}
                    onChange={(v) => updateDraft({ body: { type: draft.body.type as "json" | "raw", content: v || "" } })}
                    language={draft.body.type === "json" ? "json" : "plaintext"}
                    minimal
                  />
                ) : (draft.body.type === "form-urlencoded" || draft.body.type === "form-data") ? (
                  <div className="p-4 h-full overflow-y-auto">
                    <KeyValueTable
                      items={draft.body.pairs || []}
                      onChange={(items) => updateDraft({ body: { type: draft.body.type as "form-urlencoded" | "form-data", pairs: items } })}
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    This request does not have a body
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {showSaveDialog && (
        <SaveRequestDialog
          open={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          tab={activeTab}
        />
      )}
    </div>
  );
}

function KeyValueTable({
  items,
  onChange,
  placeholderKey = "Key",
  placeholderValue = "Value",
}: {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  placeholderKey?: string;
  placeholderValue?: string;
}) {
  const displayItems = [...items];
  const lastItem = displayItems[displayItems.length - 1];
  if (!lastItem || lastItem.key !== "" || lastItem.value !== "") {
    displayItems.push({ id: uuidv4(), key: "", value: "", enabled: true });
  }

  const updateItem = (id: string, updates: Partial<KeyValuePair>) => {
    const realItems = items.map(i => (i.id === id ? { ...i, ...updates } : i));
    if (!items.find(i => i.id === id) && (updates.key || updates.value)) {
      realItems.push({ id, key: updates.key ?? "", value: updates.value ?? "", enabled: true });
    }
    onChange(realItems);
  };

  const removeItem = (id: string) => onChange(items.filter(i => i.id !== id));

  return (
    <div className="border rounded-md overflow-hidden bg-card">
      <div className="grid grid-cols-[30px_1fr_1fr_40px] border-b bg-muted/30 text-xs font-semibold text-muted-foreground">
        <div className="p-2 text-center" />
        <div className="p-2 border-l">Key</div>
        <div className="p-2 border-l">Value</div>
        <div className="p-2 border-l" />
      </div>
      {displayItems.map((item) => {
        const isEmpty = !items.find(it => it.id === item.id);
        return (
          <div key={item.id} className="grid grid-cols-[30px_1fr_1fr_40px] border-b last:border-b-0 group hover:bg-muted/10">
            <div className="p-1 flex items-center justify-center">
              {!isEmpty && (
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => updateItem(item.id, { enabled: e.target.checked })}
                  className="rounded border-muted"
                />
              )}
            </div>
            <div className="border-l">
              <Input
                value={item.key}
                onChange={(e) => updateItem(item.id, { key: e.target.value })}
                placeholder={placeholderKey}
                className="h-8 border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-inset shadow-none font-mono text-xs"
              />
            </div>
            <div className="border-l">
              <Input
                value={item.value}
                onChange={(e) => updateItem(item.id, { value: e.target.value })}
                placeholder={placeholderValue}
                className="h-8 border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-inset shadow-none font-mono text-xs"
              />
            </div>
            <div className="border-l flex items-center justify-center">
              {!isEmpty && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                  onClick={() => removeItem(item.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
