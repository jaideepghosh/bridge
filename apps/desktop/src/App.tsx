import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@bridge/ui/tooltip";
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

const queryClient = new QueryClient();
const storage = new TauriStorageProvider();

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
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppStoreProvider storage={storage}>
            <HttpExecutorProvider execute={tauriHttpExecutor}>
              <AppLayout />
            </HttpExecutorProvider>
          </AppStoreProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

