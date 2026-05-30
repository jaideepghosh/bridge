import { useState, useRef } from "react";
import { useStore } from "../context/app-store";
import { Input } from "@bridge/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@bridge/ui/dropdown-menu";
import {
  FolderIcon, Search, Plus, ChevronRight, Download,
  Pencil, Trash2, BookOpen, X as XIcon, FolderPlus, Layers, FileCode,
} from "lucide-react";
import { HttpMethod, SavedRequest, Folder, ApiExample } from "../types";
import { NewCollectionDialog } from "./NewCollectionDialog";
import { NewFolderDialog } from "./NewFolderDialog";
import { ImportDialog } from "./ImportDialog";

const MethodColors: Record<HttpMethod, string> = {
  GET: "text-emerald-500",
  POST: "text-blue-500",
  PUT: "text-amber-500",
  PATCH: "text-violet-500",
  DELETE: "text-rose-500",
  OPTIONS: "text-slate-400",
  HEAD: "text-slate-400",
};

type DropTarget =
  | { kind: "folder"; folderId: string; collectionId: string }
  | { kind: "root"; collectionId: string };

function useRowActions(currentName: string, onRename: (name: string) => void, onDelete: () => void) {
  const [mode, setMode] = useState<"idle" | "editing" | "confirming">("idle");
  const [editValue, setEditValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setEditValue(currentName);
    setMode("editing");
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    if (editValue.trim()) onRename(editValue.trim());
    setMode("idle");
  };

  const cancelEdit = () => setMode("idle");
  const confirmDelete = () => { onDelete(); setMode("idle"); };

  return { mode, setMode, editValue, setEditValue, inputRef, startEdit, commitEdit, cancelEdit, confirmDelete };
}

function InlineNameEdit({ value, onChange, onCommit, onCancel, inputRef, className = "" }: {
  value: string; onChange: (v: string) => void; onCommit: () => void; onCancel: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>; className?: string;
}) {
  return (
    <input
      ref={inputRef}
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onCommit();
        if (e.key === "Escape") onCancel();
      }}
      className={`flex-1 min-w-0 bg-background border border-primary/50 rounded px-1 py-0 text-xs font-medium outline-none ${className}`}
      autoFocus
    />
  );
}

function InlineDeleteConfirm({ label, onConfirm, onCancel }: {
  label: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1 w-full px-2 py-1 text-[10px]" onClick={(e) => e.stopPropagation()}>
      <span className="text-destructive truncate flex-1">{label}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onConfirm(); }}
        className="bg-destructive text-destructive-foreground rounded px-1.5 py-0.5 hover:bg-destructive/80 shrink-0 font-medium"
      >Delete</button>
      <button
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        className="text-muted-foreground hover:text-foreground shrink-0"
      ><XIcon className="h-3 w-3" /></button>
    </div>
  );
}

function HoverActions({ onEdit, onDelete }: {
  onEdit: (e: React.MouseEvent) => void; onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      <button onClick={onEdit} className="p-0.5 rounded text-muted-foreground hover:text-foreground" title="Rename">
        <Pencil className="h-3 w-3" />
      </button>
      <button onClick={onDelete} className="p-0.5 rounded text-muted-foreground hover:text-destructive" title="Delete">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function FolderRow({ folder, isExpanded, isSelected, onToggle, onSelect, onRename, onDelete }: {
  folder: Folder; isExpanded: boolean; isSelected: boolean;
  onToggle: () => void; onSelect: () => void;
  onRename: (name: string) => void; onDelete: () => void;
}) {
  const { mode, setMode, editValue, setEditValue, inputRef, startEdit, commitEdit, cancelEdit, confirmDelete } =
    useRowActions(folder.name, onRename, onDelete);

  if (mode === "confirming") {
    return (
      <InlineDeleteConfirm
        label={`Delete "${folder.name}" and all its requests?`}
        onConfirm={confirmDelete} onCancel={cancelEdit}
      />
    );
  }

  return (
    <div className={`w-full flex items-center px-2 py-1.5 text-xs hover:bg-sidebar-accent rounded-sm group transition-colors ${isSelected ? "bg-sidebar-accent/60" : ""}`}>
      <button
        onClick={(e) => { e.stopPropagation(); if (mode === "idle") onToggle(); }}
        className="shrink-0 h-5 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
      </button>
      <FolderIcon className="h-3.5 w-3.5 ml-0.5 mr-1.5 text-muted-foreground group-hover:text-foreground shrink-0" />
      {mode === "editing" ? (
        <InlineNameEdit value={editValue} onChange={setEditValue} onCommit={commitEdit} onCancel={cancelEdit} inputRef={inputRef} />
      ) : (
        <span className="truncate text-sm flex-1 cursor-pointer" onClick={mode === "idle" ? onSelect : undefined}>
          {folder.name}
        </span>
      )}
      {mode === "idle" && (
        <HoverActions
          onEdit={(e) => { e.stopPropagation(); startEdit(); }}
          onDelete={(e) => { e.stopPropagation(); setMode("confirming"); }}
        />
      )}
    </div>
  );
}

type RequestRowProps = {
  req: SavedRequest; isActive: boolean;
  onClick: () => void; onDragStart: () => void; onDragEnd: () => void;
  onRename: (name: string) => void; onDelete: () => void;
  examples: ApiExample[]; onDeleteExample: (id: string) => void;
  onRenameExample: (id: string, name: string) => void; onClickExample: (ex: ApiExample) => void;
};

function RequestRow({
  req, isActive, onClick, onDragStart, onDragEnd,
  onRename, onDelete, examples, onDeleteExample, onRenameExample, onClickExample,
}: RequestRowProps) {
  const [showExamples, setShowExamples] = useState(false);
  const { mode, setMode, editValue, setEditValue, inputRef, startEdit, commitEdit, cancelEdit, confirmDelete } =
    useRowActions(req.name, onRename, onDelete);

  return (
    <div>
      {mode === "confirming" ? (
        <InlineDeleteConfirm label={`Delete "${req.name}"?`} onConfirm={confirmDelete} onCancel={cancelEdit} />
      ) : (
        <div
          data-testid={`request-${req.id}`}
          role={mode === "idle" ? "button" : undefined}
          tabIndex={mode === "idle" ? 0 : undefined}
          draggable={mode === "idle"}
          onDragStart={(e) => { if (mode !== "idle") return; e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
          onDragEnd={onDragEnd}
          onClick={mode === "idle" ? onClick : undefined}
          onKeyDown={(e) => mode === "idle" && e.key === "Enter" && onClick()}
          className={`w-full flex items-center py-1.5 px-2 text-xs hover:bg-sidebar-accent rounded-sm group transition-colors select-none ${
            mode === "idle" ? "cursor-grab active:cursor-grabbing" : ""
          } ${isActive ? "bg-sidebar-accent/70" : ""}`}
        >
          <span className={`font-bold text-[10px] w-11 text-left shrink-0 ${MethodColors[req.method] ?? MethodColors.GET}`}>
            {req.method}
          </span>
          {mode === "editing" ? (
            <InlineNameEdit value={editValue} onChange={setEditValue} onCommit={commitEdit} onCancel={cancelEdit} inputRef={inputRef} />
          ) : (
            <span className="truncate text-sidebar-foreground group-hover:text-foreground ml-1 flex-1 text-left">{req.name}</span>
          )}
          {mode === "idle" && (
            <>
              {examples.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowExamples(p => !p); }}
                  className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 shrink-0"
                  title={`${examples.length} example${examples.length > 1 ? "s" : ""}`}
                >
                  <BookOpen className="h-3 w-3" />
                  <span className="text-[10px]">{examples.length}</span>
                </button>
              )}
              <HoverActions
                onEdit={(e) => { e.stopPropagation(); startEdit(); }}
                onDelete={(e) => { e.stopPropagation(); setMode("confirming"); }}
              />
            </>
          )}
        </div>
      )}
      {showExamples && examples.length > 0 && (
        <div className="ml-3 border-l border-sidebar-border/40 pl-1 pb-0.5">
          {examples.map(ex => (
            <ExampleRow
              key={ex.id} example={ex}
              onDelete={() => onDeleteExample(ex.id)}
              onRename={(name) => onRenameExample(ex.id, name)}
              onClick={() => onClickExample(ex)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExampleRow({ example, onDelete, onRename, onClick }: {
  example: ApiExample; onDelete: () => void; onRename: (name: string) => void; onClick: () => void;
}) {
  const { mode, setMode, editValue, setEditValue, inputRef, startEdit, commitEdit, cancelEdit, confirmDelete } =
    useRowActions(example.name, onRename, onDelete);

  const statusColor =
    example.response.status >= 200 && example.response.status < 300 ? "text-emerald-500"
    : example.response.status >= 400 ? "text-rose-500" : "text-amber-500";

  if (mode === "confirming") {
    return <InlineDeleteConfirm label={`Delete "${example.name}"?`} onConfirm={confirmDelete} onCancel={cancelEdit} />;
  }

  return (
    <div
      role={mode === "idle" ? "button" : undefined}
      tabIndex={mode === "idle" ? 0 : undefined}
      onClick={mode === "idle" ? onClick : undefined}
      onKeyDown={(e) => mode === "idle" && e.key === "Enter" && onClick()}
      className="flex items-center group py-1 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-sm gap-1.5 cursor-pointer"
    >
      <span className={`text-[10px] font-bold w-8 shrink-0 ${statusColor}`}>{example.response.status}</span>
      {mode === "editing" ? (
        <InlineNameEdit value={editValue} onChange={setEditValue} onCommit={commitEdit} onCancel={cancelEdit} inputRef={inputRef} className="text-[11px]" />
      ) : (
        <span className="truncate flex-1">{example.name}</span>
      )}
      {mode === "idle" && (
        <HoverActions
          onEdit={(e) => { e.stopPropagation(); startEdit(); }}
          onDelete={(e) => { e.stopPropagation(); setMode("confirming"); }}
        />
      )}
    </div>
  );
}

export function Sidebar() {
  const {
    collections, folders, requests, examples,
    openTab, openExampleTab, selectedTabId, activeTabs,
    saveRequest, saveFolder, deleteFolder, deleteRequest,
    saveExample, deleteExample,
    selectSidebarItem, selectedSidebarItem,
  } = useStore(s => ({
    collections: s.collections,
    folders: s.folders,
    requests: s.requests,
    examples: s.examples,
    openTab: s.openTab,
    openExampleTab: s.openExampleTab,
    selectedTabId: s.selectedTabId,
    activeTabs: s.activeTabs,
    saveRequest: s.saveRequest,
    saveFolder: s.saveFolder,
    deleteFolder: s.deleteFolder,
    deleteRequest: s.deleteRequest,
    saveExample: s.saveExample,
    deleteExample: s.deleteExample,
    selectSidebarItem: s.selectSidebarItem,
    selectedSidebarItem: s.selectedSidebarItem,
  }));

  const [search, setSearch] = useState("");
  const [collapsedCollections, setCollapsedCollections] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const [showNewCollection, setShowNewCollection] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderCollectionId, setNewFolderCollectionId] = useState<string | undefined>();
  const [showImport, setShowImport] = useState(false);

  const dragReqId = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const toggleCollection = (id: string) => {
    setCollapsedCollections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isCollectionExpanded = (id: string) => !collapsedCollections.has(id);

  const lowerSearch = search.toLowerCase();
  const matchesSearch = (req: SavedRequest) =>
    !lowerSearch || req.name.toLowerCase().includes(lowerSearch) ||
    req.url.toLowerCase().includes(lowerSearch) || req.method.toLowerCase().includes(lowerSearch);

  const activeRequestId = activeTabs.find(t => t.id === selectedTabId)?.requestId;

  const handleDragStart = (reqId: string) => { dragReqId.current = reqId; };
  const handleDragOver = (e: React.DragEvent, target: DropTarget) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget(target);
  };
  const handleDrop = (e: React.DragEvent, target: DropTarget) => {
    e.preventDefault();
    const reqId = dragReqId.current;
    if (!reqId) return;
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    saveRequest({ ...req, collectionId: target.collectionId, folderId: target.kind === "folder" ? target.folderId : null, updatedAt: new Date().toISOString() });
    dragReqId.current = null; setDropTarget(null);
    if (target.kind === "folder") setExpandedFolders(prev => new Set([...prev, target.folderId]));
  };
  const handleDragLeave = () => setDropTarget(null);
  const handleDragEnd = () => { dragReqId.current = null; setDropTarget(null); };
  const isDropTarget = (target: DropTarget) => {
    if (!dropTarget || dropTarget.kind !== target.kind) return false;
    if (target.kind === "folder") return dropTarget.kind === "folder" && dropTarget.folderId === target.folderId;
    return dropTarget.collectionId === target.collectionId;
  };

  const handleRenameRequest = (req: SavedRequest, name: string) =>
    saveRequest({ ...req, name, updatedAt: new Date().toISOString() });
  const handleRenameFolder = (folder: Folder, name: string) =>
    saveFolder({ ...folder, name, updatedAt: new Date().toISOString() });
  const handleRenameExample = (exId: string, name: string) => {
    const ex = examples.find(e => e.id === exId);
    if (ex) saveExample({ ...ex, name });
  };
  const handleDeleteFolder = (folderId: string) => {
    const folderReqs = requests.filter(r => r.folderId === folderId);
    folderReqs.forEach(r => {
      examples.filter(ex => ex.requestId === r.id).forEach(ex => deleteExample(ex.id));
      deleteRequest(r.id);
    });
    deleteFolder(folderId);
  };
  const handleDeleteRequest = (reqId: string) => {
    examples.filter(ex => ex.requestId === reqId).forEach(ex => deleteExample(ex.id));
    deleteRequest(reqId);
  };

  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-3 border-b border-sidebar-border space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Filter..."
            className="h-7 pl-7 bg-sidebar-accent/40 border-sidebar-border text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-sidebar-search"
          />
        </div>
        <div className="flex gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex-1 h-7 flex items-center justify-center gap-1.5 rounded-md border border-sidebar-border text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                title="New…"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setShowNewCollection(true)}>
                <Layers className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                New Collection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setNewFolderCollectionId(collections[0]?.id); setShowNewFolder(true); }}>
                <FolderPlus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTab()}>
                <FileCode className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                New Request
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            className="h-7 px-2 flex items-center rounded-md border border-sidebar-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            onClick={() => setShowImport(true)}
            title="Import cURL (Ctrl+Shift+I)"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {collections.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            <p className="mb-2">No collections yet.</p>
            <p>Click <strong>New</strong> to create one.</p>
          </div>
        )}

        {collections.map(collection => {
          const collectionFolders = folders.filter(f => f.collectionId === collection.id);
          const rootRequests = requests.filter(r => r.collectionId === collection.id && !r.folderId).filter(matchesSearch);
          const folderMatches = collectionFolders.filter(f =>
            !lowerSearch || f.name.toLowerCase().includes(lowerSearch) ||
            requests.filter(r => r.folderId === f.id).some(matchesSearch)
          );
          const isExpanded = isCollectionExpanded(collection.id);
          const rootTarget: DropTarget = { kind: "root", collectionId: collection.id };

          if (search && rootRequests.length === 0 && folderMatches.length === 0) return null;

          return (
            <div key={collection.id} className="mb-1">
              <div
                className={`w-full flex items-center px-3 py-1.5 text-xs font-semibold tracking-wide uppercase hover:bg-sidebar-accent/40 transition-colors rounded-sm group ${
                  selectedSidebarItem?.kind === "collection" && selectedSidebarItem?.id === collection.id
                    ? "bg-sidebar-accent/60 text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <button
                  onClick={() => toggleCollection(collection.id)}
                  className="shrink-0 mr-1.5 hover:text-foreground"
                  title="Expand/collapse"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>
                <button
                  className="truncate flex-1 text-left hover:text-foreground"
                  onClick={() => {
                    selectSidebarItem({ kind: "collection", id: collection.id });
                    if (!isExpanded) toggleCollection(collection.id);
                  }}
                  title="Edit collection settings"
                >
                  {collection.name}
                </button>
              </div>

              {isExpanded && (
                <div className="ml-3 border-l border-sidebar-border/40 pl-1 mb-0.5">
                  {folderMatches.map(folder => {
                    const folderExpanded = expandedFolders.has(folder.id);
                    const folderReqs = requests.filter(r => r.folderId === folder.id).filter(matchesSearch);
                    const folderTarget: DropTarget = { kind: "folder", folderId: folder.id, collectionId: collection.id };

                    return (
                      <div key={folder.id}>
                        <FolderRow
                          folder={folder} isExpanded={folderExpanded}
                          isSelected={selectedSidebarItem?.kind === "folder" && selectedSidebarItem?.id === folder.id}
                          onToggle={() => toggleFolder(folder.id)}
                          onSelect={() => {
                            selectSidebarItem({ kind: "folder", id: folder.id });
                            if (!folderExpanded) toggleFolder(folder.id);
                          }}
                          onRename={(name) => handleRenameFolder(folder, name)}
                          onDelete={() => handleDeleteFolder(folder.id)}
                        />
                        <div
                          onDragOver={(e) => handleDragOver(e, folderTarget)}
                          onDrop={(e) => handleDrop(e, folderTarget)}
                          onDragLeave={handleDragLeave}
                          className={`ml-3 border-l border-sidebar-border/40 pl-1 rounded transition-colors ${isDropTarget(folderTarget) ? "ring-1 ring-inset ring-primary/50 bg-primary/5" : ""}`}
                        >
                          {folderExpanded && (
                            <>
                              {folderReqs.length === 0 && (
                                <div className="py-1.5 px-2 text-xs text-muted-foreground italic">
                                  {isDropTarget(folderTarget) ? "Drop here" : "Empty folder"}
                                </div>
                              )}
                              {folderReqs.map(req => (
                                <RequestRow
                                  key={req.id} req={req}
                                  isActive={req.id === activeRequestId}
                                  onClick={() => openTab(req)}
                                  onDragStart={() => handleDragStart(req.id)}
                                  onDragEnd={handleDragEnd}
                                  onRename={(name) => handleRenameRequest(req, name)}
                                  onDelete={() => handleDeleteRequest(req.id)}
                                  examples={examples.filter(ex => ex.requestId === req.id)}
                                  onDeleteExample={deleteExample}
                                  onRenameExample={handleRenameExample}
                                  onClickExample={(ex) => openExampleTab(ex.id)}
                                />
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div
                    onDragOver={(e) => handleDragOver(e, rootTarget)}
                    onDrop={(e) => handleDrop(e, rootTarget)}
                    onDragLeave={handleDragLeave}
                    className={`rounded min-h-[4px] transition-colors ${isDropTarget(rootTarget) ? "ring-1 ring-inset ring-primary/50 bg-primary/5 py-1" : ""}`}
                  >
                    {isDropTarget(rootTarget) && rootRequests.length === 0 && (
                      <div className="py-1.5 px-2 text-xs text-muted-foreground italic">Drop here</div>
                    )}
                    {rootRequests.map(req => (
                      <RequestRow
                        key={req.id} req={req}
                        isActive={req.id === activeRequestId}
                        onClick={() => openTab(req)}
                        onDragStart={() => handleDragStart(req.id)}
                        onDragEnd={handleDragEnd}
                        onRename={(name) => handleRenameRequest(req, name)}
                        onDelete={() => handleDeleteRequest(req.id)}
                        examples={examples.filter(ex => ex.requestId === req.id)}
                        onDeleteExample={deleteExample}
                        onRenameExample={handleRenameExample}
                        onClickExample={(ex) => openExampleTab(ex.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <NewCollectionDialog open={showNewCollection} onClose={() => setShowNewCollection(false)} />
      <NewFolderDialog open={showNewFolder} onClose={() => setShowNewFolder(false)} defaultCollectionId={newFolderCollectionId} />
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
