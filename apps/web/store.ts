import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { ActiveTab, Collection, Folder, SavedRequest, Environment, HttpMethod, ApiExample } from "@/types";
import { storage } from "@/services/storage";

interface AppState {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  examples: ApiExample[];
  environments: Environment[];
  activeEnvironmentId: string | null;
  
  activeTabs: ActiveTab[];
  selectedTabId: string | null;

  loadStorage: () => void;
  setActiveEnvironmentId: (id: string | null) => void;
  
  openTab: (request?: SavedRequest, draft?: Partial<ActiveTab["draft"]>) => void;
  openExampleTab: (exampleId: string) => void;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  updateTabDraft: (tabId: string, updates: Partial<ActiveTab["draft"]>) => void;
  setTabResponse: (tabId: string, response: any | null, isLoading: boolean) => void;
  
  selectedSidebarItem: { kind: "collection" | "folder"; id: string } | null;
  selectSidebarItem: (item: { kind: "collection" | "folder"; id: string } | null) => void;

  // Just basic syncing to storage
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

const createBlankTab = (): ActiveTab => ({
  id: uuidv4(),
  isDirty: false,
  draft: {
    name: "Untitled Request",
    method: "GET",
    url: "",
    headers: [],
    queryParams: [],
    body: { type: "none" },
    auth: { type: "none" }
  }
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
    auth: JSON.parse(JSON.stringify(req.auth))
  }
});

export const useStore = create<AppState>((set, get) => ({
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
      activeEnvironmentId: storage.getActiveEnvironmentId()
    });
    const state = get();
    if (state.activeTabs.length > 0 && !state.selectedTabId) {
      set({ selectedTabId: state.activeTabs[0].id });
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
        nextSelected = filtered[Math.max(0, idx - 1)].id;
      }
      return { activeTabs: filtered, selectedTabId: nextSelected };
    });
  },

  selectSidebarItem: (item) => set({ selectedSidebarItem: item }),

  selectTab: (tabId) => set({ selectedTabId: tabId }),

  updateTabDraft: (tabId, updates) => set(state => ({
    activeTabs: state.activeTabs.map(t => 
      t.id === tabId ? { ...t, isDirty: true, draft: { ...t.draft, ...updates } } : t
    )
  })),

  setTabResponse: (tabId, response, isLoading) => set(state => ({
    activeTabs: state.activeTabs.map(t => 
      t.id === tabId ? { ...t, response, isLoading } : t
    )
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
    // Update matching tab if open
    set(state => ({
      activeTabs: state.activeTabs.map(t => 
        t.requestId === req.id ? { ...t, isDirty: false, draft: { ...reqToTab(req).draft } } : t
      )
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