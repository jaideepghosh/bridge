import { useState } from "react";
import { useStore } from "../../context/app-store";
import { MonacoEditor } from "../MonacoEditor";
import { Alert, AlertDescription, AlertTitle, Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@bridge/ui";
import { BookmarkPlus, Info, WrapText, Download } from "lucide-react";
import { SaveExampleDialog } from "../request-builder/SaveExampleDialog";

const LARGE_RESPONSE_LIMIT = 500 * 1024; // 500 KB
const EXTREMELY_LARGE_LIMIT = 5 * 1024 * 1024; // 5 MB
const CHUNK_SIZE = 1024 * 1024; // 1 MB

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

export function ResponseViewer() {
  const { activeTabs, selectedTabId } = useStore(s => ({
    activeTabs: s.activeTabs,
    selectedTabId: s.selectedTabId,
  }));
  const activeTab = activeTabs.find(t => t.id === selectedTabId);
  const [wordWrap, setWordWrap] = useState(false);
  const [showSaveExampleDialog, setShowSaveExampleDialog] = useState(false);
  
  const [lastTabId, setLastTabId] = useState(activeTab?.id);
  const [forceView, setForceView] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);

  if (activeTab && activeTab.id !== lastTabId) {
    setLastTabId(activeTab.id);
    setForceView(false);
    setCurrentChunkIndex(0);
  }

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

  if (response.isUnreachableUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-card">
        <div className="w-full max-w-md">
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Testing a local API?</AlertTitle>
            <AlertDescription>
              This URL points to a service that isn&apos;t publicly accessible (such as{" "}
              <code className="font-mono text-xs">localhost</code>, a private network address, or a
              custom hostname). It can&apos;t be reached from the web app. Please use the desktop app
              to test APIs running on your machine.{" "}
              <a
                href="https://github.com/jaideepghosh/bridge/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-3 hover:text-foreground"
              >
                Download the desktop app
              </a>
              .
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

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

  const responseSize = response.size || (response.body ? response.body.length : 0);
  const isLargeResponse = responseSize > LARGE_RESPONSE_LIMIT;
  const isExtremelyLarge = responseSize > EXTREMELY_LARGE_LIMIT;

  let prettyBody = response.body;
  if (isJson && !isExtremelyLarge && (!isLargeResponse || forceView)) {
    try {
      prettyBody = JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      // leave as-is
    }
  }

  const monacoLang = isJson ? "json" : isHtml ? "html" : "plaintext";

  const downloadResponse = async () => {
    const isTauri =
      typeof window !== "undefined" &&
      ((window as any).__TAURI_IPC__ !== undefined ||
        (window as any).__TAURI_INTERNALS__ !== undefined ||
        (window as any).__TAURI__ !== undefined);

    let extension = "txt";
    if (isJson) extension = "json";
    else if (isHtml) extension = "html";
    else if (contentType.startsWith("image/")) {
      extension = contentType.split("/")[1]?.split(";")[0]?.trim() || "png";
    }
    
    const name = activeTab.draft?.name || "response";
    const filename = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.${extension}`;

    if (isTauri) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        
        const filePath = await save({
          defaultPath: filename,
          filters: [
            {
              name: isJson ? "JSON Files" : isHtml ? "HTML Files" : "All Files",
              extensions: [extension],
            },
          ],
        });
        
        if (filePath) {
          await writeTextFile(filePath, response.body);
        }
        return;
      } catch (err) {
        console.error("Tauri native download failed, falling back to browser method:", err);
      }
    }

    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      try {
        const mimeType = (contentType || "text/plain").split(";")[0]?.trim() || "text/plain";
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: isJson ? "JSON File" : isHtml ? "HTML File" : "Response File",
              accept: {
                [mimeType]: [`.${extension}`],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(response.body);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === "AbortError") {
          return;
        }
        console.error("showSaveFilePicker failed, falling back to classic download:", err);
      }
    }

    const blob = new Blob([response.body], {
      type: contentType || "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalLength = response.body ? response.body.length : 0;
  const numChunks = Math.ceil(totalLength / CHUNK_SIZE);
  const totalChunks = numChunks > 0 ? numChunks : 1;
  const startIdx = currentChunkIndex * CHUNK_SIZE;
  const endIdx = Math.min(startIdx + CHUNK_SIZE, totalLength);
  const chunkText = response.body ? response.body.slice(startIdx, endIdx) : "";

  const renderChunkedViewer = (language: string) => {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-card">
        <div className="px-3 py-1.5 border-b bg-muted/20 shrink-0 flex items-center justify-between text-xs text-muted-foreground gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[9px] font-mono font-normal">
              Chunked View
            </Badge>
            <span>
              Showing chunk {currentChunkIndex + 1} of {totalChunks} ({formatSize(endIdx - startIdx)} / {formatSize(totalLength)})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setCurrentChunkIndex(prev => Math.max(0, prev - 1))}
              disabled={currentChunkIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setCurrentChunkIndex(prev => Math.min(totalChunks - 1, prev + 1))}
              disabled={currentChunkIndex === totalChunks - 1}
            >
              Next
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1 hover:text-foreground animate-none"
              onClick={downloadResponse}
            >
              <Download className="h-3 w-3" />
              Download Full
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <MonacoEditor
            value={chunkText}
            language={language}
            options={{ readOnly: true, domReadOnly: true, wordWrap: wordWrap ? "on" : "off" }}
          />
        </div>
      </div>
    );
  };

  const headerCount = Object.keys(response.headers).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
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
              {isLargeResponse && !forceView ? (
                <LargeResponseNotice
                  size={responseSize}
                  onView={() => setForceView(true)}
                  onDownload={downloadResponse}
                />
              ) : isExtremelyLarge ? (
                renderChunkedViewer(monacoLang)
              ) : (
                <MonacoEditor
                  value={prettyBody || ""}
                  language={monacoLang}
                  options={{ readOnly: true, domReadOnly: true, wordWrap: wordWrap ? "on" : "off" }}
                />
              )}
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
              {isLargeResponse && !forceView ? (
                <LargeResponseNotice
                  size={responseSize}
                  onView={() => setForceView(true)}
                  onDownload={downloadResponse}
                />
              ) : isExtremelyLarge ? (
                renderChunkedViewer("plaintext")
              ) : (
                <MonacoEditor
                  value={response.body || ""}
                  language="plaintext"
                  options={{ readOnly: true, domReadOnly: true, wordWrap: wordWrap ? "on" : "off" }}
                />
              )}
            </TabsContent>
 
            {(isHtml || isImage) && (
              <TabsContent value="preview" className="p-0 m-0 h-full border-0 overflow-hidden">
                {isLargeResponse && !forceView ? (
                  <LargeResponseNotice
                    size={responseSize}
                    onView={() => setForceView(true)}
                    onDownload={downloadResponse}
                  />
                ) : isHtml ? (
                  isExtremelyLarge ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 bg-card text-center">
                      <div className="w-full max-w-sm p-6 border border-dashed rounded-lg text-muted-foreground text-xs space-y-3">
                        <Info className="h-5 w-5 mx-auto text-amber-500 animate-pulse" />
                        <p>HTML Preview is disabled for responses larger than 5 MB to prevent browser crashes.</p>
                        <Button variant="outline" size="sm" onClick={downloadResponse} className="gap-1.5 mx-auto">
                          <Download className="h-3.5 w-3.5" /> Download Response
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      title="Response Preview"
                      sandbox="allow-same-origin"
                      srcDoc={response.body}
                      className="w-full h-full border-0 bg-white"
                    />
                  )
                ) : isImage ? (
                  <div className="h-full flex items-center justify-center p-4 bg-muted/20">
                    <img
                      src={`data:${contentType};base64,${btoa(response.body)}`}
                      alt="Response preview"
                      className="max-w-full max-h-full object-contain"
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
 
function LargeResponseNotice({
  size,
  onView,
  onDownload,
}: {
  size: number;
  onView: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-card text-center select-none animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-md p-6 border rounded-xl bg-muted/5 backdrop-blur-sm shadow-sm space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
          <Info className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Large Response ({formatSize(size)})</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This response is large and rendering it directly inline may cause the application to become slow or lag.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="gap-2 cursor-pointer font-medium"
          >
            <Download className="h-4 w-4" />
            Download Response
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onView}
            className="cursor-pointer font-medium"
          >
            View Response
          </Button>
        </div>
      </div>
    </div>
  );
}
