import { useState, useEffect } from "react";
import { useStore } from "../../context/app-store";
import { MonacoEditor } from "../MonacoEditor";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@bridge/ui";
import {
  BookmarkPlus,
  Info,
  WrapText,
  Download,
  AlertTriangle,
  AudioLines,
  MonitorDown,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { SaveExampleDialog } from "../request-builder/SaveExampleDialog";

/** Returns true when running inside the Tauri desktop shell. */
function isTauriApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window as any).__TAURI_IPC__ !== undefined ||
    (window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI__ !== undefined
  );
}

/**
 * Attempts to open the current URL in the desktop app via the custom
 * protocol handler `bridge://open?url=<encoded>`.
 * Returns true if the protocol was dispatched (app may or may not be installed).
 */
function openInDesktopApp(url: string): boolean {
  try {
    const proto = `bridge://open?url=${encodeURIComponent(url)}`;
    window.location.href = proto;
    return true;
  } catch {
    return false;
  }
}

// ── LocalApiNotice ────────────────────────────────────────────────────────

function LocalApiNotice({ url }: { url: string }) {
  /**
   * Three visual states:
   *  "idle"     — initial render
   *  "launched" — user clicked "Open in desktop app"; protocol was dispatched
   *  "notfound" — user clicked and confirmed the app didn't open (fallback)
   */
  const [launchState, setLaunchState] = useState<
    "idle" | "launched" | "notfound"
  >("idle");

  // If we're already inside the Tauri shell this banner should never show,
  // but guard anyway.
  const isDesktop = isTauriApp();

  const handleOpenInApp = () => {
    openInDesktopApp(url);
    setLaunchState("launched");
  };

  const handleNotInstalled = () => {
    setLaunchState("notfound");
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-card">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl overflow-hidden">
          {/* Header stripe */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-500/15">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">
                Testing a local API?
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This URL isn&apos;t reachable from the browser
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <code className="font-mono bg-muted/70 border border-border/50 px-1.5 py-0.5 rounded text-[11px] text-foreground">
                {url || "localhost"}
              </code>{" "}
              points to a private or local address that can&apos;t be reached
              from a browser tab. The desktop app runs natively and can reach{" "}
              <code className="font-mono bg-muted/70 border border-border/50 px-1.5 py-0.5 rounded text-[11px] text-foreground">
                localhost
              </code>
              , custom hostnames, and services on your local network.
            </p>

            {/* Action area — changes based on state */}
            {isDesktop ? null : launchState === "idle" ? (
              <div className="flex flex-col gap-2">
                {/* Primary: try to open in app */}
                <Button
                  size="sm"
                  onClick={handleOpenInApp}
                  className="items-center justify-center"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in desktop app
                </Button>

                {/* Secondary: download */}
                <a
                  href="https://github.com/jaideepghosh/bridge/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 h-8 px-4 text-xs font-medium text-foreground bg-background hover:bg-muted border border-border rounded-lg transition-colors cursor-pointer"
                >
                  <MonitorDown className="h-3.5 w-3.5 text-muted-foreground" />
                  Download desktop app
                </a>
              </div>
            ) : launchState === "launched" ? (
              <div className="space-y-3">
                {/* Success hint */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Opening Bridge desktop…
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Your browser should prompt you to switch to the app. The
                      request URL and headers have been passed along.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 items-center justify-center">
                  {/* Escape hatch */}
                  <p className="text-xs text-muted-foreground text-center">
                    Nothing happened?{" "}
                  </p>
                  <Button
                    size="sm"
                    onClick={handleNotInstalled}
                    // className="text-foreground underline underline-offset-2 cursor-pointer hover:text-primary transition-colors"
                  >
                    Download the app
                  </Button>
                </div>
              </div>
            ) : (
              /* notfound — show download prominently */
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border">
                  <MonitorDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Desktop app not detected
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Install the app, then come back and click{" "}
                      <span className="font-medium text-foreground">
                        Open in desktop app
                      </span>
                      .
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href="https://github.com/jaideepghosh/bridge/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 h-8 px-4 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download desktop app
                  </a>
                  <button
                    onClick={() => setLaunchState("idle")}
                    className="h-8 px-3 text-xs font-medium text-muted-foreground bg-background hover:bg-muted border border-border rounded-lg transition-colors cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footnote */}
        <p className="text-center text-xs text-muted-foreground/60 mt-4">
          The desktop app works on macOS, Windows, and Linux.
        </p>
      </div>
    </div>
  );
}

const LARGE_RESPONSE_LIMIT = 500 * 1024; // 500 KB
const EXTREMELY_LARGE_LIMIT = 5 * 1024 * 1024; // 5 MB
const CHUNK_SIZE = 1024 * 1024; // 1 MB

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

// Status code → color token
function statusColor(status: number): string {
  if (status >= 200 && status < 300)
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20";
  if (status >= 300 && status < 400)
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20";
  if (status >= 400 && status < 500)
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20";
  return "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20";
}

export function ResponseViewer() {
  const { activeTabs, selectedTabId } = useStore((s) => ({
    activeTabs: s.activeTabs,
    selectedTabId: s.selectedTabId,
  }));
  const activeTab = activeTabs.find((t) => t.id === selectedTabId);
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

  // ── Empty / loading states ───────────────────────────────────────────────

  if (!activeTab || (!activeTab.response && !activeTab.isLoading)) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-card">
        <div className="h-8 w-8 flex items-center justify-center">
          <AudioLines className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">No response yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Send a request to see the response here.
          </p>
        </div>
      </div>
    );
  }

  if (activeTab.isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 bg-card">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground">Waiting for response…</p>
      </div>
    );
  }

  const { response } = activeTab;
  if (!response) return null;

  // ── Unreachable URL ──────────────────────────────────────────────────────

  if (response.isUnreachableUrl) {
    return <LocalApiNotice url={activeTab.draft?.url ?? ""} />;
  }

  // ── Response metadata ────────────────────────────────────────────────────

  const contentType = response.contentType ?? "";
  const isJson = contentType.includes("application/json");
  const isHtml = contentType.includes("text/html");
  const isImage = contentType.startsWith("image/");

  const responseSize =
    response.size || (response.body ? response.body.length : 0);
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
        if (filePath) await writeTextFile(filePath, response.body);
        return;
      } catch (err) {
        console.error("Tauri native download failed, falling back:", err);
      }
    }

    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      try {
        const mimeType =
          (contentType || "text/plain").split(";")[0]?.trim() || "text/plain";
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: isJson
                ? "JSON File"
                : isHtml
                  ? "HTML File"
                  : "Response File",
              accept: { [mimeType]: [`.${extension}`] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(response.body);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("showSaveFilePicker failed, falling back:", err);
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

  // ── Chunked viewer ───────────────────────────────────────────────────────

  const totalLength = response.body ? response.body.length : 0;
  const totalChunks = Math.max(1, Math.ceil(totalLength / CHUNK_SIZE));
  const startIdx = currentChunkIndex * CHUNK_SIZE;
  const endIdx = Math.min(startIdx + CHUNK_SIZE, totalLength);
  const chunkText = response.body ? response.body.slice(startIdx, endIdx) : "";

  const renderChunkedViewer = (language: string) => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-muted/20 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
            Chunked
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {currentChunkIndex + 1} / {totalChunks} ·{" "}
            {formatSize(endIdx - startIdx)} of {formatSize(totalLength)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="subtle"
            size="compact"
            onClick={() => setCurrentChunkIndex((p) => Math.max(0, p - 1))}
            disabled={currentChunkIndex === 0}
          >
            Previous
          </Button>
          <Button
            variant="subtle"
            size="compact"
            onClick={() =>
              setCurrentChunkIndex((p) => Math.min(totalChunks - 1, p + 1))
            }
            disabled={currentChunkIndex === totalChunks - 1}
          >
            Next
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button onClick={downloadResponse} size="sm" variant="outline">
            <Download className="h-3 w-3" />
            Download full
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={chunkText}
          language={language}
          options={{
            readOnly: true,
            domReadOnly: true,
            wordWrap: wordWrap ? "on" : "off",
          }}
        />
      </div>
    </div>
  );

  const headerCount = Object.keys(response.headers).length;

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Status bar ── */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-3">
          {/* Status code */}
          <span
            className={`inline-flex items-center h-6 px-2 rounded-md text-[11px] font-mono font-bold ${statusColor(response.status)}`}
          >
            {response.status} {response.statusText}
          </span>

          {/* Divider */}
          <div className="w-px h-3.5 bg-border" />

          {/* Timing + size */}
          <div className="flex items-center gap-2.5 text-[11px] font-mono text-muted-foreground tabular-nums">
            <span>{response.durationMs} ms</span>
            <span className="text-border">·</span>
            <span>{formatSize(response.size)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            onClick={downloadResponse}
            title="Download response"
            variant="subtle"
            size="compact"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            onClick={() => setShowSaveExampleDialog(true)}
            title="Save as example"
            variant="subtle"
            size="compact"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            <span>Save as example</span>
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs defaultValue="body" className="w-full h-full flex flex-col">
          {/* Tab bar */}
          <div className="px-4 border-b border-border shrink-0 bg-card flex items-center justify-between">
            <TabsList className="bg-transparent h-9 p-0 gap-4">
              <TabsTrigger
                value="body"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-1.5 text-xs"
              >
                Body
              </TabsTrigger>
              <TabsTrigger
                value="headers"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-1.5 text-xs"
              >
                Headers
                <span className="ml-1.5 inline-flex items-center h-4 min-w-[16px] px-1 rounded bg-muted text-[9px] font-semibold text-muted-foreground tabular-nums">
                  {headerCount}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="raw"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-1.5 text-xs"
              >
                Raw
              </TabsTrigger>
              {(isHtml || isImage) && (
                <TabsTrigger
                  value="preview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0 py-1.5 text-xs"
                >
                  Preview
                </TabsTrigger>
              )}
            </TabsList>

            {/* Word wrap toggle */}
            <Button
              onClick={() => setWordWrap((w) => !w)}
              title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
              variant="subtle"
              size="compact"
              className={`${
                wordWrap
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <WrapText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Wrap</span>
            </Button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden relative">
            {/* Body */}
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
                  options={{
                    readOnly: true,
                    domReadOnly: true,
                    wordWrap: wordWrap ? "on" : "off",
                  }}
                />
              )}
            </TabsContent>

            {/* Headers */}
            <TabsContent
              value="headers"
              className="p-0 m-0 h-full border-0 overflow-y-auto"
            >
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground tracking-wide uppercase text-[10px] w-2/5">
                      Header
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground tracking-wide uppercase text-[10px]">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(response.headers).map(([key, value], i) => (
                    <tr
                      key={key}
                      className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                        i % 2 === 0 ? "bg-background" : "bg-muted/10"
                      }`}
                    >
                      <td className="py-2 px-4 font-mono text-xs font-semibold text-muted-foreground break-all align-top">
                        {key}
                      </td>
                      <td className="py-2 px-4 font-mono text-xs break-all text-foreground">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>

            {/* Raw */}
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
                  options={{
                    readOnly: true,
                    domReadOnly: true,
                    wordWrap: wordWrap ? "on" : "off",
                  }}
                />
              )}
            </TabsContent>

            {/* Preview */}
            {(isHtml || isImage) && (
              <TabsContent
                value="preview"
                className="p-0 m-0 h-full border-0 overflow-hidden"
              >
                {isLargeResponse && !forceView ? (
                  <LargeResponseNotice
                    size={responseSize}
                    onView={() => setForceView(true)}
                    onDownload={downloadResponse}
                  />
                ) : isHtml ? (
                  isExtremelyLarge ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 bg-card">
                      <div className="w-full max-w-sm border border-amber-500/25 bg-amber-500/5 rounded-lg p-5 space-y-3 text-center">
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                          <Info className="h-4 w-4 text-amber-500" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          HTML preview is disabled for responses larger than 5
                          MB to prevent browser crashes.
                        </p>
                        <button
                          onClick={downloadResponse}
                          className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium text-foreground bg-background hover:bg-muted border border-border rounded-md transition-colors cursor-pointer mx-auto"
                        >
                          <Download className="h-3 w-3" />
                          Download response
                        </button>
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

// ── LargeResponseNotice ───────────────────────────────────────────────────

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
      <div className="w-full max-w-sm border border-amber-500/25 bg-amber-500/5 rounded-lg p-6 space-y-4">
        <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
          <Info className="h-4 w-4 text-amber-500" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground">
            Large response ({formatSize(size)})
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Rendering this inline may slow down the app. Download it or load
            anyway.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download className="h-3 w-3" />
            Download
          </Button>
          <Button size="sm" onClick={onView}>
            View anyway
          </Button>
        </div>
      </div>
    </div>
  );
}
