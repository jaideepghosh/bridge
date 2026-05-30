import { useState } from "react";
import { useStore } from "@/store";
import { MonacoEditor } from "../MonacoEditor";
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@bridge/ui";
import { WrapText, BookmarkPlus } from "lucide-react";
import { SaveExampleDialog } from "../request-builder/SaveExampleDialog";

export function ResponseViewer() {
  const { activeTabs, selectedTabId } = useStore();
  const activeTab = activeTabs.find(t => t.id === selectedTabId);
  const [wordWrap, setWordWrap] = useState(false);
  const [showSaveExampleDialog, setShowSaveExampleDialog] = useState(false);

  if (!activeTab || (!activeTab.response && !activeTab.isLoading)) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-card">
        <div className="w-16 h-16 mb-4 rounded-xl border-2 border-dashed flex items-center justify-center text-muted/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">No response yet</p>
        <p className="text-xs mt-1">Hit Send to execute the request.</p>
      </div>
    );
  }

  if (activeTab.isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-card">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
        <p className="text-sm font-medium animate-pulse">Waiting for response...</p>
      </div>
    );
  }

  const { response } = activeTab;
  if (!response) return null;

  const isSuccess = response.status >= 200 && response.status < 300;
  const isRedirect = response.status >= 300 && response.status < 400;
  const isClientError = response.status >= 400 && response.status < 500;

  const statusColor = isSuccess
    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    : isRedirect
    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
    : isClientError
    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
    : "bg-rose-500/15 text-rose-600 dark:text-rose-400";

  const contentType = response.contentType ?? "";
  const isJson = contentType.includes("application/json");
  const isHtml = contentType.includes("text/html");
  const isImage = contentType.startsWith("image/");

  let prettyBody = response.body;
  if (isJson) {
    try {
      prettyBody = JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      // leave as-is
    }
  }

  const monacoLang = isJson ? "json" : isHtml ? "html" : "plaintext";

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const headerCount = Object.keys(response.headers).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Status Bar */}
      <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/10 shrink-0">
        <div className="flex items-center space-x-3 text-sm">
          <Badge variant="outline" className={`font-mono text-xs border-0 font-bold ${statusColor}`}>
            {response.status} {response.statusText}
          </Badge>
          <span className="text-muted-foreground font-mono text-xs">{response.durationMs} ms</span>
          <span className="text-muted-foreground font-mono text-xs">{formatSize(response.size)}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setShowSaveExampleDialog(true)}
          title="Save as Example"
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save as Example
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs defaultValue="body" className="w-full h-full flex flex-col">
          <div className="px-3 border-b shrink-0 bg-card flex items-center justify-between">
            <TabsList className="bg-transparent h-9 p-0 space-x-4">
              <TabsTrigger value="body" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-1.5 text-xs">
                Body
              </TabsTrigger>
              <TabsTrigger value="headers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-1.5 text-xs">
                Headers{" "}
                <Badge variant="secondary" className="ml-1 text-[9px] px-1 h-4">{headerCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="raw" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-1.5 text-xs">
                Raw
              </TabsTrigger>
              {(isHtml || isImage) && (
                <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-1.5 text-xs">
                  Preview
                </TabsTrigger>
              )}
            </TabsList>

            {/* Word wrap toggle — only relevant for body/raw text views */}
            <button
              onClick={() => setWordWrap(w => !w)}
              title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                wordWrap
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <WrapText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Wrap</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <TabsContent value="body" className="p-0 m-0 h-full border-0">
              <MonacoEditor
                value={prettyBody || ""}
                language={monacoLang}
                options={{
                  readOnly: true,
                  domReadOnly: true,
                  wordWrap: wordWrap ? "on" : "off",
                }}
              />
            </TabsContent>

            <TabsContent value="headers" className="p-0 m-0 h-full border-0 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(response.headers).map(([key, value]) => (
                    <tr key={key} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-4 font-mono text-xs font-semibold text-muted-foreground w-1/3 break-all align-top">{key}</td>
                      <td className="py-2 px-4 font-mono text-xs break-all text-foreground">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>

            <TabsContent value="raw" className="p-0 m-0 h-full border-0">
              <MonacoEditor
                value={response.body || ""}
                language="plaintext"
                options={{
                  readOnly: true,
                  domReadOnly: true,
                  wordWrap: wordWrap ? "on" : "off",
                }}
              />
            </TabsContent>

            {(isHtml || isImage) && (
              <TabsContent value="preview" className="p-0 m-0 h-full border-0 overflow-hidden">
                {isHtml ? (
                  <iframe
                    title="Response Preview"
                    sandbox="allow-same-origin"
                    srcDoc={response.body}
                    className="w-full h-full border-0 bg-white"
                  />
                ) : isImage ? (
                  <div className="h-full flex items-center justify-center p-4 bg-muted/20">
                    <img
                      src={`data:${contentType};base64,${btoa(response.body)}`}
                      alt="Response preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        target.parentElement!.innerHTML = '<p class="text-muted-foreground text-sm">Could not render image preview</p>';
                      }}
                    />
                  </div>
                ) : null}
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>

      {showSaveExampleDialog && activeTab.response && (
        <SaveExampleDialog
          open={showSaveExampleDialog}
          onClose={() => setShowSaveExampleDialog(false)}
          tab={activeTab}
          response={activeTab.response}
        />
      )}
    </div>
  );
}
