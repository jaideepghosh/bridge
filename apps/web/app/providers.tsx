"use client";

import { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@bridge/ui/tooltip";
import { useRouter, usePathname } from "next/navigation";
import {
  AppStoreProvider,
  HttpExecutorProvider,
  BrowserFileSystemStorageProvider,
  ThemeProvider,
  useStore,
} from "@bridge/components";
import { webProxyExecutor } from "@/services/proxy-executor";

type ProvidersProps = {
  children: React.ReactNode;
};

const storage = new BrowserFileSystemStorageProvider();

// Helper to parse pathnames
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

function RouteSync() {
  const router = useRouter();
  const pathname = usePathname();

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
  const setNavigate = useStore(s => s.setNavigate);

  // 1. Initialize navigate function in the store
  useEffect(() => {
    setNavigate((url: string) => router.push(url));
    return () => setNavigate(null);
  }, [router, setNavigate]);

  const lastSyncedPathnameRef = useRef("");
  const lastNavigatedUrlRef = useRef("");

  // 2. Bidirectional sync
  useEffect(() => {
    if (!isLoaded) return;

    // Check if URL changed externally (browser navigation/load)
    const isBrowserUrlChange =
      pathname !== lastSyncedPathnameRef.current &&
      pathname !== lastNavigatedUrlRef.current;

    if (isBrowserUrlChange) {
      // URL changed -> Sync to Store
      const { workspaceId, folderId, requestId } = parsePathname(pathname);

      // Sync Request Tab
      if (requestId) {
        const req = requests.find(r => r.id === requestId);
        if (req) {
          const activeTab = activeTabs.find(t => t.id === selectedTabId);
          if (activeTab?.requestId !== requestId) {
            const existingTab = activeTabs.find(t => t.requestId === requestId);
            if (existingTab) {
              selectTab(existingTab.id);
            } else {
              openTab(req);
            }
          }
        }
      } else {
        const activeTab = activeTabs.find(t => t.id === selectedTabId);
        if (activeTab?.requestId) {
          const blankTab = activeTabs.find(t => !t.requestId);
          if (blankTab) {
            selectTab(blankTab.id);
          } else {
            openTab();
          }
        }
      }

      // Sync Sidebar selection
      if (folderId) {
        if (selectedSidebarItem?.kind !== "folder" || selectedSidebarItem?.id !== folderId) {
          selectSidebarItem({ kind: "folder", id: folderId });
        }
      } else if (workspaceId && !requestId) {
        if (selectedSidebarItem?.kind !== "collection" || selectedSidebarItem?.id !== workspaceId) {
          selectSidebarItem({ kind: "collection", id: workspaceId });
        }
      } else {
        if (selectedSidebarItem !== null) {
          selectSidebarItem(null);
        }
      }

      // Sync expand/collapse
      if (workspaceId) {
        setCollectionCollapsed(workspaceId, false);
      }
      if (folderId) {
        setFolderExpanded(folderId, true);
      }

      lastSyncedPathnameRef.current = pathname;
      lastNavigatedUrlRef.current = pathname;
    } else {
      // Store changed -> Sync to URL
      const activeTab = activeTabs.find(t => t.id === selectedTabId);
      let targetUrl = "/";

      if (activeTab?.requestId) {
        const req = requests.find(r => r.id === activeTab.requestId);
        if (req) {
          if (req.folderId) {
            targetUrl = `/workspace/${req.collectionId}/folder/${req.folderId}/request/${req.id}`;
          } else {
            targetUrl = `/workspace/${req.collectionId}/request/${req.id}`;
          }
        }
      } else if (selectedSidebarItem) {
        if (selectedSidebarItem.kind === "collection") {
          targetUrl = `/workspace/${selectedSidebarItem.id}`;
        } else if (selectedSidebarItem.kind === "folder") {
          const folder = folders.find(f => f.id === selectedSidebarItem.id);
          if (folder) {
            targetUrl = `/workspace/${folder.collectionId}/folder/${folder.id}`;
          }
        }
      }

      if (pathname !== targetUrl && targetUrl !== lastNavigatedUrlRef.current) {
        lastNavigatedUrlRef.current = targetUrl;
        lastSyncedPathnameRef.current = pathname;
        router.push(targetUrl);
      } else if (pathname === targetUrl) {
        lastSyncedPathnameRef.current = pathname;
      }
    }
  }, [
    pathname,
    isLoaded,
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
    router,
  ]);

  return null;
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppStoreProvider storage={storage}>
            <HttpExecutorProvider execute={webProxyExecutor}>
              <RouteSync />
              {children}
            </HttpExecutorProvider>
          </AppStoreProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
