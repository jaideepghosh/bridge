import { useState, useRef, useCallback, useEffect } from "react";
import { useStore } from "../../context/app-store";
import { useHttpExecutor } from "../../context/http-executor";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@bridge/ui";
import { Plus, X, Play, Save } from "lucide-react";
import { HttpMethod, KeyValuePair, Environment } from "../../types";
import {
  prepareProxyRequest,
  resolveInheritedConfig,
} from "../../services/http-client";
import { MonacoEditor } from "../MonacoEditor";
import { RichTextEditor } from "../RichTextEditor";
import { CodeGeneratorDialog } from "../CodeGeneratorDialog";
import { UrlInput } from "./UrlInput";
import { VariableInput } from "./VariableInput";
import { SaveRequestDialog } from "./SaveRequestDialog";
import { v4 as uuidv4 } from "uuid";

const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-500",
  POST: "text-blue-500",
  PUT: "text-amber-500",
  PATCH: "text-violet-500",
  DELETE: "text-rose-500",
  OPTIONS: "text-slate-500",
  HEAD: "text-slate-500",
};

const RESERVED_TLDS = new Set([
  ".local",
  ".localhost",
  ".internal",
  ".test",
  ".invalid",
  ".example",
]);

function isNonPublicUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    // Single-label hostname (no dot) — covers `localhost`, custom /etc/hosts aliases, bare server names
    if (!hostname.includes(".")) return true;
    // Reserved / mDNS TLDs
    const lower = hostname.toLowerCase();
    if (RESERVED_TLDS.has("." + lower.split(".").pop())) return true;
    // Private IPv4 ranges
    const v4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (v4) {
      const a = Number(v4[1]);
      const b = Number(v4[2]);
      if (a === 10) return true;
      if (a === 127) return true;
      if (a === 0) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
    }
    // IPv6 loopback [::1]
    if (hostname === "[::1]" || hostname === "::1") return true;
    return false;
  } catch {
    return false;
  }
}

export function RequestBuilder({
  checkUnreachableUrl = false,
}: { checkUnreachableUrl?: boolean } = {}) {
  const {
    activeTabs,
    selectedTabId,
    selectTab,
    closeTab,
    openTab,
    reopenLastClosedTab,
    updateTabDraft,
    setTabResponse,
    environments,
    activeEnvironmentId,
    collections,
    folders,
    requests,
    navigate,
  } = useStore((s) => ({
    activeTabs: s.activeTabs,
    selectedTabId: s.selectedTabId,
    selectTab: s.selectTab,
    closeTab: s.closeTab,
    openTab: s.openTab,
    reopenLastClosedTab: s.reopenLastClosedTab,
    updateTabDraft: s.updateTabDraft,
    setTabResponse: s.setTabResponse,
    environments: s.environments,
    activeEnvironmentId: s.activeEnvironmentId,
    collections: s.collections,
    folders: s.folders,
    requests: s.requests,
    navigate: s.navigate,
  }));

  const handleSelectTab = useCallback(
    (tab: (typeof activeTabs)[0]) => {
      if (navigate) {
        if (tab.requestId) {
          const req = requests.find((r) => r.id === tab.requestId);
          if (req) {
            if (req.folderId) {
              navigate(
                `/workspace/${req.collectionId}/folder/${req.folderId}/request/${req.id}`,
              );
            } else {
              navigate(`/workspace/${req.collectionId}/request/${req.id}`);
            }
          }
        } else {
          navigate("/");
        }
      } else {
        selectTab(tab.id);
      }
    },
    [navigate, requests, selectTab],
  );
  const executeRequest = useHttpExecutor();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(
    null,
  );
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const handleRequestCloseTab = useCallback(
    (tabId: string) => {
      const tab = activeTabs.find((t) => t.id === tabId);
      if (tab?.isDirty) {
        setConfirmCloseTabId(tabId);
      } else {
        closeTab(tabId);
      }
    },
    [activeTabs, closeTab],
  );

  const handleSendRef = useRef<() => void>(() => {});
  const handleSaveRef = useRef<() => void>(() => {});

  const activeTabsRef = useRef(activeTabs);
  const selectedTabIdRef = useRef(selectedTabId);
  const renamingTabIdRef = useRef(renamingTabId);
  const openTabRef = useRef(openTab);
  const closeTabRef = useRef(closeTab);
  const selectTabRef = useRef(selectTab);
  const reopenLastClosedTabRef = useRef(reopenLastClosedTab);
  const handleRequestCloseTabRef = useRef(handleRequestCloseTab);

  useEffect(() => {
    activeTabsRef.current = activeTabs;
    selectedTabIdRef.current = selectedTabId;
    renamingTabIdRef.current = renamingTabId;
    openTabRef.current = openTab;
    closeTabRef.current = closeTab;
    selectTabRef.current = selectTab;
    reopenLastClosedTabRef.current = reopenLastClosedTab;
    handleRequestCloseTabRef.current = handleRequestCloseTab;
  });

  useEffect(() => {
    const isMac =
      typeof window !== "undefined" &&
      navigator.userAgent.toLowerCase().includes("mac");

    const isInputTarget = (e: KeyboardEvent): boolean => {
      const target = e.target as HTMLElement | null;
      if (!target) return false;
      const tagName = target.tagName;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT"
      ) {
        return true;
      }
      if (target.isContentEditable) {
        return true;
      }
      if (
        target.closest(".monaco-editor") ||
        target.closest(".inputarea") ||
        target.classList.contains("inputarea")
      ) {
        return true;
      }
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      if (renamingTabIdRef.current !== null) {
        return;
      }

      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // Standard browser shortcuts we want to intercept globally
      const isTabShortcut =
        isCmdOrCtrl &&
        (key === "t" ||
          key === "w" ||
          key === "]" ||
          key === "[" ||
          key === "}" ||
          key === "{" ||
          /^[1-9]$/.test(key));

      if (!isTabShortcut && isInputTarget(e)) {
        if (isCmdOrCtrl) {
          if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
          if (key === "s") {
            e.preventDefault();
            handleSaveRef.current();
          }
          if (key === "enter") {
            e.preventDefault();
            handleSendRef.current();
          }
        }
        return;
      }

      if (isCmdOrCtrl) {
        // Cmd+T / Ctrl+T -> Create and activate a new tab (or Shift+Cmd+T to reopen)
        if (key === "t" && !e.altKey) {
          e.preventDefault();
          if (e.shiftKey) {
            reopenLastClosedTabRef.current();
          } else {
            openTabRef.current();
          }
          return;
        }

        // Cmd+W / Ctrl+W -> Close active tab (Option+Cmd+W to Force Close)
        if (key === "w") {
          e.preventDefault();
          const activeTabId = selectedTabIdRef.current;
          if (!activeTabId) return;

          const isForceClose = e.altKey;
          if (isForceClose) {
            closeTabRef.current(activeTabId);
          } else {
            handleRequestCloseTabRef.current(activeTabId);
          }
          return;
        }

        // Next/Prev Tab
        if (
          e.shiftKey &&
          (key === "]" || key === "}" || key === "[" || key === "{")
        ) {
          e.preventDefault();
          const tabs = activeTabsRef.current;
          if (tabs.length <= 1) return;
          const currentIdx = tabs.findIndex(
            (t) => t.id === selectedTabIdRef.current,
          );
          if (currentIdx === -1) return;

          const isNext = key === "]" || key === "}";
          const nextIdx = isNext
            ? (currentIdx + 1) % tabs.length
            : (currentIdx - 1 + tabs.length) % tabs.length;

          const nextTab = tabs[nextIdx];
          if (nextTab) {
            selectTabRef.current(nextTab.id);
          }
          return;
        }

        // Switch corresponding tab
        if (/^[1-9]$/.test(key) && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          const tabs = activeTabsRef.current;
          if (tabs.length === 0) return;

          if (key === "9") {
            const lastTab = tabs[tabs.length - 1];
            if (lastTab) selectTabRef.current(lastTab.id);
          } else {
            const targetIdx = parseInt(key) - 1;
            const targetTab = tabs[targetIdx];
            if (targetTab) selectTabRef.current(targetTab.id);
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeTab = activeTabs.find((t) => t.id === selectedTabId);
  const activeEnv =
    environments.find((e) => e.id === activeEnvironmentId) || null;

  if (!activeTab)
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No open tabs
      </div>
    );

  const { draft } = activeTab;

  const handleSend = async () => {
    if (activeTab.isLoading) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      return;
    }

    if (!draft.url) return;
    setTabResponse(activeTab.id, null, true);
    const startTime = Date.now();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const savedReq = requests.find((r) => r.id === activeTab.requestId);
      const collection = savedReq
        ? collections.find((c) => c.id === savedReq.collectionId)
        : undefined;
      const folder = savedReq?.folderId
        ? folders.find((f) => f.id === savedReq.folderId)
        : undefined;
      const inherited = resolveInheritedConfig(collection, folder);
      const proxyReq = prepareProxyRequest(draft, activeEnv, inherited);

      if (checkUnreachableUrl && isNonPublicUrl(proxyReq.url)) {
        setTabResponse(
          activeTab.id,
          {
            status: 0,
            statusText: "",
            headers: {},
            body: "",
            durationMs: 0,
            size: 0,
            isUnreachableUrl: true,
          },
          false,
        );
        abortControllerRef.current = null;
        return;
      }

      let accumulatedBody = "";
      let currentStatus = 0;
      let currentStatusText = "";
      let currentHeaders: Record<string, string> = {};

      const res = await executeRequest(proxyReq, {
        signal: controller.signal,
        onHeaders: (status, statusText, headers) => {
          currentStatus = status;
          currentStatusText = statusText;
          currentHeaders = headers;

          setTabResponse(
            activeTab.id,
            {
              status,
              statusText,
              headers,
              body: "",
              durationMs: Date.now() - startTime,
              size: 0,
              contentType: headers["content-type"] || headers["Content-Type"],
            },
            true,
          );
        },
        onChunk: (chunk) => {
          accumulatedBody += chunk;
          const durationMs = Date.now() - startTime;
          const size = new TextEncoder().encode(accumulatedBody).length;

          setTabResponse(
            activeTab.id,
            {
              status: currentStatus,
              statusText: currentStatusText,
              headers: currentHeaders,
              body: accumulatedBody,
              durationMs,
              size,
              contentType:
                currentHeaders["content-type"] ||
                currentHeaders["Content-Type"],
            },
            true,
          );
        },
      });

      setTabResponse(activeTab.id, res, false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setTabResponse(
          activeTab.id,
          {
            status: 0,
            statusText: "Cancelled",
            headers: {},
            body: "Request cancelled by user",
            durationMs: Date.now() - startTime,
            size: 0,
          },
          false,
        );
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to execute request";
        setTabResponse(
          activeTab.id,
          {
            status: 0,
            statusText: "Error",
            headers: {},
            body: message,
            durationMs: Date.now() - startTime,
            size: 0,
          },
          false,
        );
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const updateDraft = (updates: Partial<typeof draft>) =>
    updateTabDraft(activeTab.id, updates);

  handleSendRef.current = handleSend;
  handleSaveRef.current = () => setShowSaveDialog(true);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Tab Bar */}
      <div className="flex bg-muted/30 border-b overflow-x-auto no-scrollbar shrink-0">
        {activeTabs.map((tab) => {
          const isRenaming = renamingTabId === tab.id;
          return (
            <div
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center min-w-[120px] max-w-[220px] h-9 px-3 border-r cursor-pointer text-xs transition-colors ${
                tab.id === selectedTabId
                  ? "bg-background border-t-2 border-t-primary"
                  : "hover:bg-muted"
              }`}
              onClick={() => !isRenaming && handleSelectTab(tab)}
            >
              <span
                className={`font-bold mr-2 text-[10px] shrink-0 ${METHOD_COLORS[tab.draft.method] ?? METHOD_COLORS.GET}`}
              >
                {tab.draft.method}
              </span>

              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingTabId(null);
                    e.stopPropagation();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-background border border-primary/50 rounded px-1 py-0 text-xs font-medium outline-none"
                  autoFocus
                />
              ) : (
                <span
                  className="truncate flex-1 font-medium"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleSelectTab(tab);
                    startRename(tab.id, tab.draft.name);
                  }}
                  title="Double-click to rename"
                >
                  {tab.draft.name}
                </span>
              )}

              {tab.isDirty && !isRenaming && (
                <div
                  className="h-1.5 w-1.5 rounded-full bg-amber-500 mx-1 shrink-0"
                  title="Unsaved changes"
                />
              )}
              <button
                className="ml-1 text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100 p-0.5 rounded shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRequestCloseTab(tab.id);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        <button
          data-testid="button-new-tab"
          className="px-3 hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground"
          onClick={() => {
            if (navigate) {
              navigate("/");
            } else {
              openTab();
            }
          }}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* URL Bar */}
      <div className="p-3 border-b flex gap-2 shrink-0 items-center">
        <Select
          value={draft.method}
          onValueChange={(v: HttpMethod) => updateDraft({ method: v })}
          disabled={activeTab.isLoading}
        >
          <SelectTrigger
            data-testid="select-method"
            className={`w-[100px] font-mono font-bold text-xs h-9 bg-muted/50 border-0 focus:ring-1 ${METHOD_COLORS[draft.method] ?? ""}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem
                key={m}
                value={m}
                className={`font-mono text-xs font-bold ${METHOD_COLORS[m]}`}
              >
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <UrlInput
          value={draft.url}
          onChange={(v) => updateDraft({ url: v })}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          env={activeEnv}
          placeholder="https://api.example.com/v1/users or paste a cURL command"
          disabled={activeTab.isLoading}
        />

        <Button
          data-testid="button-send"
          onClick={handleSend}
          variant={activeTab.isLoading ? "destructive" : "default"}
          className={`h-9 px-6 font-medium tracking-wide shrink-0 transition-colors duration-200 ${
            !activeTab.isLoading
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : ""
          }`}
        >
          {activeTab.isLoading ? (
            <>
              Cancel
              <X className="h-3.5 w-3.5 ml-2" />
            </>
          ) : (
            <>
              Send
              <Play className="h-3 w-3 ml-2" fill="currentColor" />
            </>
          )}
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

        <CodeGeneratorDialog request={draft} />
      </div>

      {/* Request Settings Tabs */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs defaultValue="params" className="w-full h-full flex flex-col">
          <div className="px-3 border-b shrink-0">
            <TabsList className="bg-transparent h-10 p-0 space-x-6">
              <TabsTrigger
                value="docs"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-2 text-xs"
              >
                Docs
              </TabsTrigger>
              <TabsTrigger
                value="params"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-2 text-xs"
              >
                Params
              </TabsTrigger>
              <TabsTrigger
                value="headers"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-2 text-xs"
              >
                Headers
              </TabsTrigger>
              <TabsTrigger
                value="auth"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-2 text-xs"
              >
                Auth
              </TabsTrigger>
              <TabsTrigger
                value="body"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-2 text-xs"
              >
                Body
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent
              value="docs"
              className="p-4 m-0 h-full border-0 flex flex-col overflow-hidden"
            >
              <RichTextEditor
                value={draft.description}
                onChange={(v) => updateDraft({ description: v })}
                placeholder="Describe this request..."
              />
            </TabsContent>
            <TabsContent value="params" className="p-4 m-0 h-full border-0">
              <KeyValueTable
                items={draft.queryParams}
                onChange={(items) => updateDraft({ queryParams: items })}
                env={activeEnv}
                placeholderKey="Query Parameter"
              />
            </TabsContent>
            <TabsContent value="headers" className="p-4 m-0 h-full border-0">
              <KeyValueTable
                items={draft.headers}
                onChange={(items) => updateDraft({ headers: items })}
                env={activeEnv}
                placeholderKey="Header"
              />
            </TabsContent>
            <TabsContent value="auth" className="p-4 m-0 h-full border-0">
              <div className="max-w-md space-y-4">
                <Select
                  value={draft.auth.type}
                  onValueChange={(
                    v: "none" | "bearer" | "basic" | "apiKey",
                  ) => {
                    if (v === "none") updateDraft({ auth: { type: "none" } });
                    else if (v === "bearer")
                      updateDraft({ auth: { type: "bearer", token: "" } });
                    else if (v === "basic")
                      updateDraft({
                        auth: { type: "basic", username: "", password: "" },
                      });
                    else
                      updateDraft({
                        auth: {
                          type: "apiKey",
                          key: "X-API-Key",
                          value: "",
                          in: "header",
                        },
                      });
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
                    <label className="text-xs font-semibold text-muted-foreground">
                      Token
                    </label>
                    <div className="flex h-9 rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring focus-within:border-primary overflow-hidden">
                      <VariableInput
                        value={draft.auth.token || ""}
                        onChange={(v) =>
                          updateDraft({ auth: { type: "bearer", token: v } })
                        }
                        env={activeEnv}
                        placeholder="eyJ..."
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
                {draft.auth.type === "basic" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        Username
                      </label>
                      <div className="flex h-9 rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring focus-within:border-primary overflow-hidden mt-1">
                        <VariableInput
                          value={draft.auth.username}
                          onChange={(v) =>
                            updateDraft({
                              auth: {
                                type: "basic",
                                username: v,
                                password: (
                                  draft.auth as {
                                    type: "basic";
                                    username: string;
                                    password: string;
                                  }
                                ).password,
                              },
                            })
                          }
                          env={activeEnv}
                          placeholder="username"
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        Password
                      </label>
                      <div className="flex h-9 rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring focus-within:border-primary overflow-hidden mt-1">
                        <VariableInput
                          type="password"
                          value={draft.auth.password}
                          onChange={(v) =>
                            updateDraft({
                              auth: {
                                type: "basic",
                                username: (
                                  draft.auth as {
                                    type: "basic";
                                    username: string;
                                    password: string;
                                  }
                                ).username,
                                password: v,
                              },
                            })
                          }
                          env={activeEnv}
                          placeholder="password"
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {draft.auth.type === "apiKey" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        Key Name
                      </label>
                      <div className="flex h-9 rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring focus-within:border-primary overflow-hidden mt-1">
                        <VariableInput
                          value={draft.auth.key}
                          onChange={(v) => {
                            const a = draft.auth as {
                              type: "apiKey";
                              key: string;
                              value: string;
                              in: "header" | "query";
                            };
                            updateDraft({
                              auth: {
                                type: "apiKey",
                                key: v,
                                value: a.value,
                                in: a.in,
                              },
                            });
                          }}
                          env={activeEnv}
                          placeholder="X-API-Key"
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        Value
                      </label>
                      <div className="flex h-9 rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring focus-within:border-primary overflow-hidden mt-1">
                        <VariableInput
                          value={draft.auth.value}
                          onChange={(v) => {
                            const a = draft.auth as {
                              type: "apiKey";
                              key: string;
                              value: string;
                              in: "header" | "query";
                            };
                            updateDraft({
                              auth: {
                                type: "apiKey",
                                key: a.key,
                                value: v,
                                in: a.in,
                              },
                            });
                          }}
                          env={activeEnv}
                          placeholder="api_key_value"
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">
                        Add to
                      </label>
                      <Select
                        value={draft.auth.in}
                        onValueChange={(v: "header" | "query") => {
                          const a = draft.auth as {
                            type: "apiKey";
                            key: string;
                            value: string;
                            in: "header" | "query";
                          };
                          updateDraft({
                            auth: {
                              type: "apiKey",
                              key: a.key,
                              value: a.value,
                              in: v,
                            },
                          });
                        }}
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
            <TabsContent
              value="body"
              className="p-0 m-0 h-full border-0 flex flex-col"
            >
              <div className="p-2 border-b shrink-0 flex items-center gap-2">
                <Select
                  value={draft.body.type}
                  onValueChange={(
                    v:
                      | "none"
                      | "json"
                      | "raw"
                      | "form-urlencoded"
                      | "form-data",
                  ) =>
                    updateDraft({
                      body:
                        v === "none"
                          ? { type: "none" }
                          : v === "json"
                            ? { type: "json", content: "" }
                            : v === "raw"
                              ? { type: "raw", content: "" }
                              : { type: v, pairs: [] },
                    })
                  }
                >
                  <SelectTrigger className="w-[160px] h-8 text-xs border-dashed">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Body</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="raw">Raw</SelectItem>
                    <SelectItem value="form-urlencoded">
                      Form URL-Encoded
                    </SelectItem>
                    <SelectItem value="form-data">Form Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-h-0 relative">
                {draft.body.type === "json" || draft.body.type === "raw" ? (
                  <MonacoEditor
                    value={draft.body.content || ""}
                    onChange={(v) =>
                      updateDraft({
                        body: {
                          type: draft.body.type as "json" | "raw",
                          content: v || "",
                        },
                      })
                    }
                    language={draft.body.type === "json" ? "json" : "plaintext"}
                    minimal
                  />
                ) : draft.body.type === "form-urlencoded" ||
                  draft.body.type === "form-data" ? (
                  <div className="p-4 h-full overflow-y-auto">
                    <KeyValueTable
                      items={draft.body.pairs || []}
                      onChange={(items) =>
                        updateDraft({
                          body: {
                            type: draft.body.type as
                              | "form-urlencoded"
                              | "form-data",
                            pairs: items,
                          },
                        })
                      }
                      env={activeEnv}
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

      {confirmCloseTabId !== null && (
        <Dialog
          open={confirmCloseTabId !== null}
          onOpenChange={(open) => !open && setConfirmCloseTabId(null)}
        >
          <DialogContent className="max-w-sm p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-sm font-semibold">
                Unsaved Changes
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                You have unsaved changes in this request. Are you sure you want
                to close this tab? Any unsaved changes will be lost.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmCloseTabId(null)}
                className="text-xs animate-none cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirmCloseTabId) {
                    closeTab(confirmCloseTabId);
                  }
                  setConfirmCloseTabId(null);
                }}
                className="text-xs font-semibold animate-none cursor-pointer"
              >
                Close Anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function KeyValueTable({
  items,
  onChange,
  placeholderKey = "Key",
  placeholderValue = "Value",
  env,
}: {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  placeholderKey?: string;
  placeholderValue?: string;
  env: Environment | null;
}) {
  const displayItems = [...items];
  const lastItem = displayItems[displayItems.length - 1];
  if (!lastItem || lastItem.key !== "" || lastItem.value !== "") {
    displayItems.push({ id: uuidv4(), key: "", value: "", enabled: true });
  }

  const updateItem = (id: string, updates: Partial<KeyValuePair>) => {
    const realItems = items.map((i) =>
      i.id === id ? { ...i, ...updates } : i,
    );
    if (!items.find((i) => i.id === id) && (updates.key || updates.value)) {
      realItems.push({
        id,
        key: updates.key ?? "",
        value: updates.value ?? "",
        enabled: true,
      });
    }
    onChange(realItems);
  };

  const removeItem = (id: string) => onChange(items.filter((i) => i.id !== id));

  return (
    <div className="border rounded-md overflow-hidden bg-card">
      <div className="grid grid-cols-[30px_1fr_1fr_40px] border-b bg-muted/30 text-xs font-semibold text-muted-foreground">
        <div className="p-2 text-center" />
        <div className="p-2 border-l">Key</div>
        <div className="p-2 border-l">Value</div>
        <div className="p-2 border-l" />
      </div>
      {displayItems.map((item) => {
        const isEmpty = !items.find((it) => it.id === item.id);
        return (
          <div
            key={item.id}
            className="grid grid-cols-[30px_1fr_1fr_40px] border-b last:border-b-0 group hover:bg-muted/10"
          >
            <div className="p-1 flex items-center justify-center">
              {!isEmpty && (
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) =>
                    updateItem(item.id, { enabled: e.target.checked })
                  }
                  className="rounded border-muted"
                />
              )}
            </div>
            <div className="border-l h-8 flex items-center">
              <VariableInput
                value={item.key}
                onChange={(v) => updateItem(item.id, { key: v })}
                placeholder={placeholderKey}
                env={env}
                className="h-full border-0 rounded-none bg-transparent shadow-none"
              />
            </div>
            <div className="border-l h-8 flex items-center">
              <VariableInput
                value={item.value}
                onChange={(v) => updateItem(item.id, { value: v })}
                placeholder={placeholderValue}
                env={env}
                className="h-full border-0 rounded-none bg-transparent shadow-none"
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
