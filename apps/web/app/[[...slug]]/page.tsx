"use client";

import { usePathname } from "next/navigation";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@bridge/ui/resizable";
import {
  Sidebar,
  TopBar,
  Footer,
  RequestBuilder,
  ResponseViewer,
  ConfigPanel,
  useStore,
} from "@bridge/components";

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

function AppLayout() {
  const selectedSidebarItem = useStore((s) => s.selectedSidebarItem);
  const pathname = usePathname();
  const { requestId } = parsePathname(pathname);

  // If a request is active in the URL, we show the RequestBuilder
  // otherwise, we show the ConfigPanel if a sidebar item is selected.
  const showConfigPanel = selectedSidebarItem && !requestId;

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      <TopBar />
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={30}
            className="border-r"
          >
            <Sidebar />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={80}>
            {showConfigPanel ? (
              <ConfigPanel />
            ) : (
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel defaultSize={60} minSize={20}>
                  <RequestBuilder checkUnreachableUrl />
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel
                  defaultSize={40}
                  minSize={20}
                  className="border-t bg-card"
                >
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

export default function Home() {
  return <AppLayout />;
}
