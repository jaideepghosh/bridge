"use client";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@payable-turborepo-starter/ui/resizable";
import { TooltipProvider } from "@payable-turborepo-starter/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AppStoreProvider,
  HttpExecutorProvider,
  BrowserFileSystemStorageProvider,
  ThemeProvider,
  Sidebar,
  TopBar,
  RequestBuilder,
  ResponseViewer,
  ConfigPanel,
  useStore,
} from "@payable-turborepo-starter/components";
import { webProxyExecutor } from "@/services/proxy-executor";

const queryClient = new QueryClient();
const storage = new BrowserFileSystemStorageProvider();

function AppLayout() {
  const selectedSidebarItem = useStore(s => s.selectedSidebarItem);

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
            {selectedSidebarItem ? (
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
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppStoreProvider storage={storage}>
            <HttpExecutorProvider execute={webProxyExecutor}>
              <AppLayout />
            </HttpExecutorProvider>
          </AppStoreProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
