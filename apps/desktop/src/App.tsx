import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@bridge/ui/tooltip";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@bridge/ui/resizable";
import {
  AppStoreProvider,
  HttpExecutorProvider,
  ThemeProvider,
  Sidebar,
  TopBar,
  Footer,
  RequestBuilder,
  ResponseViewer,
  ConfigPanel,
  useStore,
} from "@bridge/components";
import { tauriHttpExecutor } from "./services/http-executor";
import { TauriStorageProvider } from "./services/storage";
import { AnalyticsProvider } from "./AnalyticsProvider";

const queryClient = new QueryClient();
const storage = new TauriStorageProvider();

// Helper to parse deep links
function parseDeepLink(urlStr: string) {
  let path = urlStr;
  if (urlStr.startsWith("bridge://")) {
    path = "/" + urlStr.slice("bridge://".length);
  } else if (urlStr.startsWith("bridge:")) {
    path = "/" + urlStr.slice("bridge:".length);
  }
  path = path.replace(/^\/+/, "/");
  return path;
}

function parsePathname(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  let workspaceId: string | null = null;
  let folderId: string | null = null;
  let requestId: string | null = null;

  if (parts[0] === "workspace" && parts[1]) {
    workspaceId = parts[1];
    if (parts[2] === "request" && parts[3]) {
      requestId = parts[3];
    } else if (parts[2] === "folder" && parts[3]) {
      folderId = parts[3];
      if (parts[4] === "request" && parts[5]) {
        requestId = parts[5];
      }
    }
  }

  return { workspaceId, folderId, requestId };
}

function DeepLinkSync() {
  const isLoaded = useStore(s => s.isLoaded);
  const collections = useStore(s => s.collections);
  const folders = useStore(s => s.folders);
  const requests = useStore(s => s.requests);
  const activeTabs = useStore(s => s.activeTabs);
  const selectedTabId = useStore(s => s.selectedTabId);
  const selectedSidebarItem = useStore(s => s.selectedSidebarItem);

  const openTab = useStore(s => s.openTab);
  const selectTab = useStore(s => s.selectTab);
  const selectSidebarItem = useStore(s => s.selectSidebarItem);
  const setCollectionCollapsed = useStore(s => s.setCollectionCollapsed);
  const setFolderExpanded = useStore(s => s.setFolderExpanded);

  const startUrlProcessedRef = useRef(false);
  const stateRef = useRef({
    collections,
    folders,
    requests,
    activeTabs,
    selectedTabId,
    selectedSidebarItem,
    openTab,
    selectTab,
    selectSidebarItem,
    setCollectionCollapsed,
    setFolderExpanded,
  });

  // Keep stateRef up to date on every render
  useEffect(() => {
    stateRef.current = {
      collections,
      folders,
      requests,
      activeTabs,
      selectedTabId,
      selectedSidebarItem,
      openTab,
      selectTab,
      selectSidebarItem,
      setCollectionCollapsed,
      setFolderExpanded,
    };
  });

  useEffect(() => {
    if (!isLoaded) return;

    let active = true;
    let unlisten: (() => void) | null = null;

    function handleUrls(urls: string[]) {
      if (!urls || urls.length === 0) return;
      const rawUrl = urls[0];
      if (!rawUrl) return;

      const path = parseDeepLink(rawUrl);
      const { workspaceId, folderId, requestId } = parsePathname(path);
      const state = stateRef.current;

      // Sync Request Tab
      if (requestId) {
        const req = state.requests.find(r => r.id === requestId);
        if (req) {
          const activeTab = state.activeTabs.find(t => t.id === state.selectedTabId);
          if (activeTab?.requestId !== requestId) {
            const existingTab = state.activeTabs.find(t => t.requestId === requestId);
            if (existingTab) {
              state.selectTab(existingTab.id);
            } else {
              state.openTab(req);
            }
          }
        }
      } else {
        const activeTab = state.activeTabs.find(t => t.id === state.selectedTabId);
        if (activeTab?.requestId) {
          const blankTab = state.activeTabs.find(t => !t.requestId);
          if (blankTab) {
            state.selectTab(blankTab.id);
          } else {
            state.openTab();
          }
        }
      }

      // Sync Sidebar selection
      if (folderId) {
        if (state.selectedSidebarItem?.kind !== "folder" || state.selectedSidebarItem?.id !== folderId) {
          state.selectSidebarItem({ kind: "folder", id: folderId });
        }
      } else if (workspaceId && !requestId) {
        if (state.selectedSidebarItem?.kind !== "collection" || state.selectedSidebarItem?.id !== workspaceId) {
          state.selectSidebarItem({ kind: "collection", id: workspaceId });
        }
      } else {
        if (state.selectedSidebarItem !== null) {
          state.selectSidebarItem(null);
        }
      }

      // Sync expand/collapse
      if (workspaceId) {
        state.setCollectionCollapsed(workspaceId, false);
      }
      if (folderId) {
        state.setFolderExpanded(folderId, true);
      }
    }

    async function setupListeners() {
      try {
        if (!startUrlProcessedRef.current) {
          startUrlProcessedRef.current = true;
          const startUrls = await getCurrent();
          if (startUrls && startUrls.length > 0 && active) {
            console.log("[DeepLink] Started with deep link:", startUrls);
            handleUrls(startUrls);
          }
        }

        unlisten = await onOpenUrl((urls) => {
          if (active) {
            console.log("[DeepLink] Received new deep link:", urls);
            handleUrls(urls);
          }
        });
      } catch (err) {
        console.error("[DeepLink] Failed to set up listeners:", err);
      }
    }

    setupListeners();

    return () => {
      active = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, [isLoaded]);

  return null;
}

function AppLayout() {
  const selectedSidebarItem = useStore(s => s.selectedSidebarItem);
  const activeTabs = useStore(s => s.activeTabs);
  const selectedTabId = useStore(s => s.selectedTabId);

  const activeTab = activeTabs.find(t => t.id === selectedTabId);
  const hasActiveRequest = !!activeTab?.requestId;
  const showConfigPanel = selectedSidebarItem && !hasActiveRequest;

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      <TopBar />
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="border-r">
            <Sidebar />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={80}>
            {showConfigPanel ? (
              <ConfigPanel />
            ) : (
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel defaultSize={60} minSize={20}>
                  <RequestBuilder />
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={40} minSize={20} className="border-t bg-card">
                  <ResponseViewer />
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AnalyticsProvider>
      <ThemeProvider defaultTheme="light" attribute="class">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AppStoreProvider storage={storage}>
              <HttpExecutorProvider execute={tauriHttpExecutor}>
                <DeepLinkSync />
                <AppLayout />
              </HttpExecutorProvider>
            </AppStoreProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </AnalyticsProvider>
  );
}

