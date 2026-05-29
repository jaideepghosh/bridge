import { createStore, StoreApi, useStore as useZustandStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  ActiveTab, Collection, Folder, SavedRequest, Environment, HttpMethod, ApiExample,
} from "../types";
import { StorageProvider } from "../services/storage/types";
import { StorageDirectoryModal } from "../components/StorageDirectoryModal";
import { Folder as FolderIcon } from "lucide-react";
import { Button } from "@payable-turborepo-starter/ui";

// ─── State shape ─────────────────────────────────────────────────────────────

export interface AppState {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  examples: ApiExample[];
  environments: Environment[];
  activeEnvironmentId: string | null;

  activeTabs: ActiveTab[];
  selectedTabId: string | null;
  selectedSidebarItem: { kind: "collection" | "folder"; id: string } | null;

  loadStorage: () => void;
  setActiveEnvironmentId: (id: string | null) => void;

  openTab: (request?: SavedRequest, draft?: Partial<ActiveTab["draft"]>) => void;
  openExampleTab: (exampleId: string) => void;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  updateTabDraft: (tabId: string, updates: Partial<ActiveTab["draft"]>) => void;
  setTabResponse: (tabId: string, response: any | null, isLoading: boolean) => void;
  selectSidebarItem: (item: { kind: "collection" | "folder"; id: string } | null) => void;

  saveEnvironment: (env: Environment) => void;
  deleteEnvironment: (id: string) => void;
  saveRequest: (req: SavedRequest) => void;
  deleteRequest: (id: string) => void;
  saveCollection: (col: Collection) => void;
  deleteCollection: (id: string) => void;
  saveFolder: (folder: Folder) => void;
  deleteFolder: (id: string) => void;
  saveExample: (example: ApiExample) => void;
  deleteExample: (id: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createBlankTab = (): ActiveTab => ({
  id: uuidv4(),
  isDirty: false,
  draft: {
    name: "Untitled Request",
    method: "GET" as HttpMethod,
    url: "",
    headers: [],
    queryParams: [],
    body: { type: "none" },
    auth: { type: "none" },
  },
});

const reqToTab = (req: SavedRequest): ActiveTab => ({
  id: uuidv4(),
  requestId: req.id,
  isDirty: false,
  draft: {
    name: req.name,
    method: req.method,
    url: req.url,
    headers: JSON.parse(JSON.stringify(req.headers)),
    queryParams: JSON.parse(JSON.stringify(req.queryParams)),
    body: JSON.parse(JSON.stringify(req.body)),
    auth: JSON.parse(JSON.stringify(req.auth)),
  },
});

// ─── Store factory ────────────────────────────────────────────────────────────

export function createAppStore(storage: StorageProvider): StoreApi<AppState> {
  return createStore<AppState>((set, get) => ({
    collections: [],
    folders: [],
    requests: [],
    examples: [],
    environments: [],
    activeEnvironmentId: null,

    activeTabs: [createBlankTab()],
    selectedTabId: null,
    selectedSidebarItem: null,

    loadStorage: () => {
      set({
        collections: storage.getCollections(),
        folders: storage.getFolders(),
        requests: storage.getRequests(),
        examples: storage.getExamples(),
        environments: storage.getEnvironments(),
        activeEnvironmentId: storage.getActiveEnvironmentId(),
      });
      const state = get();
      if (state.activeTabs.length > 0 && !state.selectedTabId) {
        set({ selectedTabId: state.activeTabs[0]?.id || null });
      }
    },

    setActiveEnvironmentId: (id) => {
      storage.setActiveEnvironmentId(id);
      set({ activeEnvironmentId: id });
    },

    openExampleTab: (exampleId) => {
      const { examples, requests } = get();
      const ex = examples.find(e => e.id === exampleId);
      if (!ex) return;
      const req = requests.find(r => r.id === ex.requestId) ?? ex.request;
      set(state => {
        const newTab: ActiveTab = {
          id: uuidv4(),
          requestId: req.id,
          isDirty: false,
          draft: {
            name: `${ex.name} (${ex.response.status})`,
            method: ex.request.method,
            url: ex.request.url,
            headers: JSON.parse(JSON.stringify(ex.request.headers)),
            queryParams: JSON.parse(JSON.stringify(ex.request.queryParams)),
            body: JSON.parse(JSON.stringify(ex.request.body)),
            auth: JSON.parse(JSON.stringify(ex.request.auth)),
          },
          response: { ...ex.response },
          isLoading: false,
        };
        return { activeTabs: [...state.activeTabs, newTab], selectedTabId: newTab.id, selectedSidebarItem: null };
      });
    },

    openTab: (request, draftOverride) => {
      set(state => {
        if (request) {
          const existing = state.activeTabs.find(t => t.requestId === request.id);
          if (existing) return { selectedTabId: existing.id };
        }
        const newTab = request ? reqToTab(request) : createBlankTab();
        if (draftOverride) {
          newTab.draft = { ...newTab.draft, ...draftOverride };
          newTab.isDirty = true;
        }
        return { activeTabs: [...state.activeTabs, newTab], selectedTabId: newTab.id, selectedSidebarItem: null };
      });
    },

    closeTab: (tabId) => {
      set(state => {
        const filtered = state.activeTabs.filter(t => t.id !== tabId);
        if (filtered.length === 0) {
          const newTab = createBlankTab();
          return { activeTabs: [newTab], selectedTabId: newTab.id };
        }
        let nextSelected = state.selectedTabId;
        if (state.selectedTabId === tabId) {
          const idx = state.activeTabs.findIndex(t => t.id === tabId);
          nextSelected = filtered[Math.max(0, idx - 1)]?.id || null;
        }
        return { activeTabs: filtered, selectedTabId: nextSelected };
      });
    },

    selectSidebarItem: (item) => set({ selectedSidebarItem: item }),
    selectTab: (tabId) => set({ selectedTabId: tabId }),

    updateTabDraft: (tabId, updates) => set(state => ({
      activeTabs: state.activeTabs.map(t =>
        t.id === tabId ? { ...t, isDirty: true, draft: { ...t.draft, ...updates } } : t
      ),
    })),

    setTabResponse: (tabId, response, isLoading) => set(state => ({
      activeTabs: state.activeTabs.map(t =>
        t.id === tabId ? { ...t, response, isLoading } : t
      ),
    })),

    saveEnvironment: (env) => {
      storage.saveEnvironment(env);
      set({ environments: storage.getEnvironments() });
    },
    deleteEnvironment: (id) => {
      storage.deleteEnvironment(id);
      set({ environments: storage.getEnvironments() });
      if (get().activeEnvironmentId === id) {
        get().setActiveEnvironmentId(null);
      }
    },
    saveRequest: (req) => {
      storage.saveRequest(req);
      set({ requests: storage.getRequests() });
      set(state => ({
        activeTabs: state.activeTabs.map(t =>
          t.requestId === req.id ? { ...t, isDirty: false, draft: { ...reqToTab(req).draft } } : t
        ),
      }));
    },
    deleteRequest: (id) => {
      storage.deleteRequest(id);
      set({ requests: storage.getRequests() });
    },
    saveCollection: (col) => {
      storage.saveCollection(col);
      set({ collections: storage.getCollections() });
    },
    deleteCollection: (id) => {
      storage.deleteCollection(id);
      set({ collections: storage.getCollections() });
    },
    saveFolder: (folder) => {
      storage.saveFolder(folder);
      set({ folders: storage.getFolders() });
    },
    deleteFolder: (id) => {
      storage.deleteFolder(id);
      set({ folders: storage.getFolders() });
    },
    saveExample: (example) => {
      storage.saveExample(example);
      set({ examples: storage.getExamples() });
    },
    deleteExample: (id) => {
      storage.deleteExample(id);
      set({ examples: storage.getExamples() });
    },
  }));
}

// ─── React context ────────────────────────────────────────────────────────────

const AppStoreContext = createContext<StoreApi<AppState> | null>(null);

export function AppStoreProvider({
  storage,
  children,
}: {
  storage: StorageProvider;
  children: ReactNode;
}) {
  const storeRef = useRef<StoreApi<AppState>>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);

  if (!storeRef.current) {
    storeRef.current = createAppStore(storage);
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasDir = localStorage.getItem("bridge_storage_directory");
      if (!hasDir) {
        setShowPrompt(true);
      }
    }
  }, []);

  // After storage.initialize() completes, load data into the store.
  // For localStorage this resolves immediately; for file-based storage it awaits the file read.
  useEffect(() => {
    storage.initialize()
      .then(() => {
        if (storage.requiresPermissionGesture) {
          setNeedsPermission(true);
        } else {
          storeRef.current!.getState().loadStorage();
        }
      })
      .catch((err) => {
        console.error("[AppStoreProvider] storage.initialize() failed:", err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (needsPermission) {
    const workspaceName = typeof window !== "undefined" ? localStorage.getItem("bridge_storage_directory") : "";
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border/80 bg-card/95 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <FolderIcon className="h-8 w-8 animate-bounce" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Authorize Folder Access
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bridge is configured to save all REST collections, environments, folders, and request histories inside your local folder:
            </p>
            <div className="px-4 py-2 rounded-lg bg-muted text-foreground font-semibold text-xs border truncate max-w-full">
              {workspaceName || "Selected Folder"}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              To respect your privacy, the browser requires you to re-authorize read/write access to this folder for this session.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={async () => {
                if (storage.requestPermissionGesture) {
                  const granted = await storage.requestPermissionGesture();
                  if (granted) {
                    setNeedsPermission(false);
                    storeRef.current!.getState().loadStorage();
                  }
                }
              }}
              className="w-full h-11 flex items-center justify-center gap-2 font-semibold text-sm shadow-lg transition-all active:scale-95 cursor-pointer animate-pulse hover:animate-none"
            >
              <FolderIcon className="h-4.5 w-4.5" />
              Grant Folder Access
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("bridge_storage_directory");
                  import("../services/storage/indexedDb").then(({ clearDirectoryHandle }) => {
                    clearDirectoryHandle().then(() => {
                      window.location.reload();
                    });
                  });
                }
              }}
              className="w-full h-10 text-xs text-muted-foreground border-border/60 hover:text-foreground cursor-pointer"
            >
              Reset Workspace Folder
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppStoreContext.Provider value={storeRef.current}>
      {children}
      <StorageDirectoryModal
        open={showPrompt}
        forcePrompt={true}
        storage={storage}
      />
    </AppStoreContext.Provider>
  );
}

export function useStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("useStore must be used within AppStoreProvider");
  return useZustandStore(store, useShallow(selector));
}
