"use client";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@payable-turborepo-starter/ui/resizable";

import { RequestBuilder } from "@/components/request-builder/RequestBuilder";
import { ResponseViewer } from "@/components/response-viewer/ResponseViewer";
import { TopBar } from "@/components/layout/TopBar";
import { ConfigPanel } from "@/components/config-panel/ConfigPanel";
import { useStore } from "@/store";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@payable-turborepo-starter/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";

const queryClient = new QueryClient();

export default function Home() {
  const selectedSidebarItem = useStore(state => state.selectedSidebarItem);

  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
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
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
