import { useState } from "react";
import { useStore } from "@/store";
import { AuthConfig, KeyValuePair, ScopeConfig } from "@/types";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger } from "@bridge/ui";
import { FolderIcon, Layers, X, ChevronRight, ChevronDown, Info } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// ─── Key-Value Table ──────────────────────────────────────────────────────────
function KVTable({
  items,
  onChange,
  readOnly = false,
  placeholderKey = "Key",
  placeholderValue = "Value",
}: {
  items: KeyValuePair[];
  onChange?: (items: KeyValuePair[]) => void;
  readOnly?: boolean;
  placeholderKey?: string;
  placeholderValue?: string;
}) {
  const displayItems = readOnly ? items.filter(i => i.key) : [...items];
  if (!readOnly) {
    const last = displayItems[displayItems.length - 1];
    if (!last || last.key !== "" || last.value !== "") {
      displayItems.push({ id: uuidv4(), key: "", value: "", enabled: true });
    }
  }

  const update = (id: string, upd: Partial<KeyValuePair>) => {
    if (!onChange) return;
    const real = items.map(i => (i.id === id ? { ...i, ...upd } : i));
    if (!items.find(i => i.id === id) && (upd.key || upd.value)) {
      real.push({ id, key: upd.key ?? "", value: upd.value ?? "", enabled: true });
    }
    onChange(real);
  };
  const remove = (id: string) => onChange && onChange(items.filter(i => i.id !== id));

  return (
    <div className={`border rounded-md overflow-hidden bg-card ${readOnly ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-[30px_1fr_1fr_40px] border-b bg-muted/30 text-xs font-semibold text-muted-foreground">
        <div className="p-2 text-center" />
        <div className="p-2 border-l">Key</div>
        <div className="p-2 border-l">Value</div>
        <div className="p-2 border-l" />
      </div>
      {displayItems.map(item => {
        const isEmpty = !items.find(it => it.id === item.id);
        return (
          <div key={item.id} className="grid grid-cols-[30px_1fr_1fr_40px] border-b last:border-b-0 group hover:bg-muted/10">
            <div className="p-1 flex items-center justify-center">
              {!isEmpty && (
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={e => !readOnly && update(item.id, { enabled: e.target.checked })}
                  disabled={readOnly}
                  className="rounded border-muted"
                />
              )}
            </div>
            <div className="border-l">
              <Input
                value={item.key}
                onChange={e => update(item.id, { key: e.target.value })}
                placeholder={placeholderKey}
                readOnly={readOnly}
                className="h-8 border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-inset shadow-none font-mono text-xs"
              />
            </div>
            <div className="border-l">
              <Input
                value={item.value}
                onChange={e => update(item.id, { value: e.target.value })}
                placeholder={placeholderValue}
                readOnly={readOnly}
                className="h-8 border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-inset shadow-none font-mono text-xs"
              />
            </div>
            <div className="border-l flex items-center justify-center">
              {!isEmpty && !readOnly && (
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                  onClick={() => remove(item.id)}
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

// ─── Auth Editor ─────────────────────────────────────────────────────────────
function AuthEditor({ auth, onChange, readOnly = false }: {
  auth: AuthConfig;
  onChange?: (auth: AuthConfig) => void;
  readOnly?: boolean;
}) {
  const handleTypeChange = (v: string) => {
    if (!onChange) return;
    if (v === "none") onChange({ type: "none" });
    else if (v === "bearer") onChange({ type: "bearer", token: "" });
    else if (v === "basic") onChange({ type: "basic", username: "", password: "" });
    else onChange({ type: "apiKey", key: "X-API-Key", value: "", in: "header" });
  };

  return (
    <div className={`max-w-md space-y-4 ${readOnly ? "opacity-60 pointer-events-none" : ""}`}>
      <Select value={auth.type} onValueChange={handleTypeChange} disabled={readOnly}>
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

      {auth.type === "bearer" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Token</label>
          <Input
            value={auth.token}
            onChange={e => onChange && onChange({ type: "bearer", token: e.target.value })}
            readOnly={readOnly}
            className="font-mono text-sm"
            placeholder="eyJ..."
          />
        </div>
      )}
      {auth.type === "basic" && (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Username</label>
            <Input
              value={auth.username}
              onChange={e => onChange && onChange({ ...auth, username: e.target.value })}
              readOnly={readOnly}
              className="font-mono text-sm"
              placeholder="username"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Password</label>
            <Input
              type="password"
              value={auth.password}
              onChange={e => onChange && onChange({ ...auth, password: e.target.value })}
              readOnly={readOnly}
              className="font-mono text-sm"
              placeholder="password"
            />
          </div>
        </div>
      )}
      {auth.type === "apiKey" && (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Key Name</label>
            <Input
              value={auth.key}
              onChange={e => onChange && onChange({ ...auth, key: e.target.value })}
              readOnly={readOnly}
              className="font-mono text-sm"
              placeholder="X-API-Key"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Value</label>
            <Input
              value={auth.value}
              onChange={e => onChange && onChange({ ...auth, value: e.target.value })}
              readOnly={readOnly}
              className="font-mono text-sm"
              placeholder="api_key_value"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Add to</label>
            <Select
              value={auth.in}
              onValueChange={(v: "header" | "query") => onChange && onChange({ ...auth, in: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="query">Query Param</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inherited collapsible section ───────────────────────────────────────────
function InheritedSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5 pt-4 border-t border-dashed border-border/60">
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        onClick={() => setOpen(p => !p)}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Info className="h-3 w-3" />
        {label}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

const AUTH_LABEL: Record<string, string> = {
  none: "No Auth",
  bearer: "Bearer Token",
  basic: "Basic Auth",
  apiKey: "API Key",
};

const TAB_TRIGGER = "rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-2 text-xs";

// ─── Main ConfigPanel ─────────────────────────────────────────────────────────
export function ConfigPanel() {
  const {
    selectedSidebarItem, selectSidebarItem,
    collections, folders,
    saveCollection, saveFolder,
  } = useStore();

  if (!selectedSidebarItem) return null;

  const isCollection = selectedSidebarItem.kind === "collection";
  const folder = !isCollection ? folders.find(f => f.id === selectedSidebarItem.id) : undefined;
  const collection = isCollection
    ? collections.find(c => c.id === selectedSidebarItem.id)
    : collections.find(c => c.id === folder?.collectionId);

  const item = isCollection ? collection : folder;
  if (!item) return null;

  const config: ScopeConfig = item.config ?? {};
  const parentConfig: ScopeConfig | undefined = folder ? (collection?.config ?? {}) : undefined;

  const updateConfig = (updates: Partial<ScopeConfig>) => {
    const newConfig: ScopeConfig = { ...config, ...updates };
    if (isCollection && collection) {
      saveCollection({ ...collection, config: newConfig, updatedAt: new Date().toISOString() });
    } else if (folder) {
      saveFolder({ ...folder, config: newConfig, updatedAt: new Date().toISOString() });
    }
  };

  const auth: AuthConfig = config.auth ?? { type: "none" };
  const headers: KeyValuePair[] = config.headers ?? [];
  const variables: KeyValuePair[] = config.variables ?? [];

  const parentAuth = parentConfig?.auth;
  const parentHeaders = parentConfig?.headers ?? [];
  const parentVariables = parentConfig?.variables ?? [];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {isCollection
            ? <Layers className="h-4 w-4 text-muted-foreground" />
            : <FolderIcon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold truncate">{item.name}</h2>
          <p className="text-xs text-muted-foreground">
            {isCollection ? "Collection" : `Folder · ${collection?.name}`}
          </p>
        </div>
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={() => selectSidebarItem(null)}
          title="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Info bar */}
      <div className="px-4 py-2 bg-muted/20 border-b flex items-center gap-1.5 shrink-0">
        <Info className="h-3 w-3 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          {isCollection
            ? "Auth, headers, and variables set here are inherited by all folders and requests in this collection."
            : "Settings here override the parent collection's. Requests in this folder inherit these values unless they set their own."}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="auth" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 border-b shrink-0">
          <TabsList className="bg-transparent h-10 p-0 space-x-6">
            <TabsTrigger value="auth" className={TAB_TRIGGER}>Auth</TabsTrigger>
            <TabsTrigger value="headers" className={TAB_TRIGGER}>
              Headers{headers.filter(h => h.enabled && h.key).length > 0
                ? ` (${headers.filter(h => h.enabled && h.key).length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="variables" className={TAB_TRIGGER}>
              Variables{variables.filter(v => v.enabled && v.key).length > 0
                ? ` (${variables.filter(v => v.enabled && v.key).length})` : ""}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Auth Tab */}
          <TabsContent value="auth" className="p-4 m-0 border-0">
            <p className="text-xs text-muted-foreground mb-4">
              {isCollection
                ? "Default authentication applied to all requests in this collection."
                : "Override the collection's authentication for this folder. Choose No Auth to disable inherited auth."}
            </p>
            <AuthEditor auth={auth} onChange={a => updateConfig({ auth: a })} />
            {parentAuth && parentAuth.type !== "none" && (
              <InheritedSection label={`Inherited from "${collection?.name}": ${AUTH_LABEL[parentAuth.type] ?? parentAuth.type}`}>
                <AuthEditor auth={parentAuth} readOnly />
              </InheritedSection>
            )}
          </TabsContent>

          {/* Headers Tab */}
          <TabsContent value="headers" className="p-4 m-0 border-0">
            <p className="text-xs text-muted-foreground mb-4">
              {isCollection
                ? "Headers added to every request in this collection. Request-level headers override these."
                : "Additional headers merged with the collection's. Folder values override matching collection keys."}
            </p>
            <KVTable items={headers} onChange={h => updateConfig({ headers: h })} placeholderKey="Header Name" placeholderValue="Header Value" />
            {parentHeaders.filter(h => h.key).length > 0 && (
              <InheritedSection label={`${parentHeaders.filter(h => h.enabled && h.key).length} header(s) inherited from "${collection?.name}"`}>
                <KVTable items={parentHeaders} readOnly placeholderKey="Header Name" placeholderValue="Header Value" />
              </InheritedSection>
            )}
          </TabsContent>

          {/* Variables Tab */}
          <TabsContent value="variables" className="p-4 m-0 border-0">
            <p className="text-xs text-muted-foreground mb-4">
              {isCollection
                ? "Variables available via {{VARIABLE_NAME}} in all requests. Environment variables take priority over these."
                : "Additional variables for this folder. Folder values override matching collection variable names."}
            </p>
            <KVTable items={variables} onChange={v => updateConfig({ variables: v })} placeholderKey="Variable Name" placeholderValue="Value" />
            {parentVariables.filter(v => v.key).length > 0 && (
              <InheritedSection label={`${parentVariables.filter(v => v.enabled && v.key).length} variable(s) inherited from "${collection?.name}"`}>
                <KVTable items={parentVariables} readOnly placeholderKey="Variable Name" placeholderValue="Value" />
              </InheritedSection>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
