import { useState, useRef, useEffect } from "react";
import { useStore } from "../context/app-store";
import { Input } from "@bridge/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@bridge/ui/dropdown-menu";
import {
  FolderIcon,
  Search,
  Plus,
  ChevronRight,
  Download,
  Pencil,
  Trash2,
  BookOpen,
  X as XIcon,
  FolderPlus,
  Layers,
  FileCode,
  MoreHorizontal,
} from "lucide-react";
import {
  HttpMethod,
  SavedRequest,
  Folder,
  ApiExample,
  Collection,
} from "../types";
import { NewCollectionDialog } from "./NewCollectionDialog";
import { NewFolderDialog } from "./NewFolderDialog";
import { ImportDialog } from "./ImportDialog";
import { ExportConfirmationDialog } from "./ExportConfirmationDialog";
import { getExporter } from "@bridge/importer";
import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@bridge/ui";

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

function useRowActions(
  currentName: string,
  onRename: (name: string) => void,
  onDelete: () => void,
) {
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
  const confirmDelete = () => {
    onDelete();
    setMode("idle");
  };

  return {
    mode,
    setMode,
    editValue,
    setEditValue,
    inputRef,
    startEdit,
    commitEdit,
    cancelEdit,
    confirmDelete,
  };
}

function InlineNameEdit({
  value,
  onChange,
  onCommit,
  onCancel,
  inputRef,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  className?: string;
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

function InlineDeleteConfirm({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1 w-full px-2 py-1 text-[10px]"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-destructive truncate flex-1">{label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onConfirm();
        }}
        className="bg-destructive text-destructive-foreground rounded px-1.5 py-0.5 hover:bg-destructive/80 shrink-0 font-medium"
      >
        Delete
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

function HoverActions({
  onEdit,
  onDelete,
  onExport,
}: {
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onExport: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(e);
        }}
        className="p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
        title="Rename"
      >
        <Pencil className="h-3 w-3" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="More actions"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-28"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onExport(e);
            }}
            className="cursor-pointer"
          >
            Export
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CollectionRow({
  collection,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onRename,
  onDelete,
  onExport,
}: {
  collection: Collection;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const {
    mode,
    setMode,
    editValue,
    setEditValue,
    inputRef,
    startEdit,
    commitEdit,
    cancelEdit,
    confirmDelete,
  } = useRowActions(collection.name, onRename, onDelete);

  if (mode === "confirming") {
    return (
      <InlineDeleteConfirm
        label={`Delete "${collection.name}" and all its requests?`}
        onConfirm={confirmDelete}
        onCancel={cancelEdit}
      />
    );
  }

  return (
    <div
      className={`w-full flex items-center px-3 py-1.5 text-xs font-semibold tracking-wide uppercase hover:bg-sidebar-accent/40 transition-colors rounded-sm group ${
        isSelected
          ? "bg-sidebar-accent/60 text-foreground"
          : "text-muted-foreground"
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (mode === "idle") onToggle();
        }}
        className="shrink-0 mr-1.5 hover:text-foreground"
        title="Expand/collapse"
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
        />
      </button>
      {mode === "editing" ? (
        <InlineNameEdit
          value={editValue}
          onChange={setEditValue}
          onCommit={commitEdit}
          onCancel={cancelEdit}
          inputRef={inputRef}
          className="normal-case font-semibold text-xs text-foreground"
        />
      ) : (
        <span
          className="truncate flex-1 text-left hover:text-foreground cursor-pointer"
          onClick={mode === "idle" ? onSelect : undefined}
          title="Collection settings"
        >
          {collection.name}
        </span>
      )}
      {mode === "idle" && (
        <HoverActions
          onEdit={(e) => {
            e.stopPropagation();
            startEdit();
          }}
          onDelete={(e) => {
            e.stopPropagation();
            setMode("confirming");
          }}
          onExport={(e) => {
            e.stopPropagation();
            onExport();
          }}
        />
      )}
    </div>
  );
}

function FolderRow({
  folder,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onRename,
  onDelete,
  onExport,
}: {
  folder: Folder;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const {
    mode,
    setMode,
    editValue,
    setEditValue,
    inputRef,
    startEdit,
    commitEdit,
    cancelEdit,
    confirmDelete,
  } = useRowActions(folder.name, onRename, onDelete);

  if (mode === "confirming") {
    return (
      <InlineDeleteConfirm
        label={`Delete "${folder.name}" and all its requests?`}
        onConfirm={confirmDelete}
        onCancel={cancelEdit}
      />
    );
  }

  return (
    <div
      className={`w-full flex items-center px-2 py-1.5 text-xs hover:bg-sidebar-accent rounded-sm group transition-colors ${isSelected ? "bg-sidebar-accent/60" : ""}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (mode === "idle") onToggle();
        }}
        className="shrink-0 h-5 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
        />
      </button>
      <FolderIcon className="h-3.5 w-3.5 ml-0.5 mr-1.5 text-muted-foreground group-hover:text-foreground shrink-0" />
      {mode === "editing" ? (
        <InlineNameEdit
          value={editValue}
          onChange={setEditValue}
          onCommit={commitEdit}
          onCancel={cancelEdit}
          inputRef={inputRef}
        />
      ) : (
        <span
          className="truncate text-sm flex-1 cursor-pointer"
          onClick={mode === "idle" ? onSelect : undefined}
        >
          {folder.name}
        </span>
      )}
      {mode === "idle" && (
        <HoverActions
          onEdit={(e) => {
            e.stopPropagation();
            startEdit();
          }}
          onDelete={(e) => {
            e.stopPropagation();
            setMode("confirming");
          }}
          onExport={(e) => {
            e.stopPropagation();
            onExport();
          }}
        />
      )}
    </div>
  );
}

type RequestRowProps = {
  req: SavedRequest;
  isActive: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  examples: ApiExample[];
  onDeleteExample: (id: string) => void;
  onRenameExample: (id: string, name: string) => void;
  onClickExample: (ex: ApiExample) => void;
  onExport: () => void;
};

function RequestRow({
  req,
  isActive,
  onClick,
  onDragStart,
  onDragEnd,
  onRename,
  onDelete,
  examples,
  onDeleteExample,
  onRenameExample,
  onClickExample,
  onExport,
}: RequestRowProps) {
  const [showExamples, setShowExamples] = useState(false);
  const {
    mode,
    setMode,
    editValue,
    setEditValue,
    inputRef,
    startEdit,
    commitEdit,
    cancelEdit,
    confirmDelete,
  } = useRowActions(req.name, onRename, onDelete);

  return (
    <div>
      {mode === "confirming" ? (
        <InlineDeleteConfirm
          label={`Delete "${req.name}"?`}
          onConfirm={confirmDelete}
          onCancel={cancelEdit}
        />
      ) : (
        <div
          data-testid={`request-${req.id}`}
          role={mode === "idle" ? "button" : undefined}
          tabIndex={mode === "idle" ? 0 : undefined}
          draggable={mode === "idle"}
          onDragStart={(e) => {
            if (mode !== "idle") return;
            e.dataTransfer.effectAllowed = "move";
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          onClick={mode === "idle" ? onClick : undefined}
          onKeyDown={(e) => mode === "idle" && e.key === "Enter" && onClick()}
          className={`w-full flex items-center py-1.5 px-2 text-xs hover:bg-sidebar-accent rounded-sm group transition-colors select-none ${
            mode === "idle" ? "cursor-grab active:cursor-grabbing" : ""
          } ${isActive ? "bg-sidebar-accent/70" : ""}`}
        >
          <span
            className={`font-bold text-[10px] w-11 text-left shrink-0 ${MethodColors[req.method] ?? MethodColors.GET}`}
          >
            {req.method}
          </span>
          {mode === "editing" ? (
            <InlineNameEdit
              value={editValue}
              onChange={setEditValue}
              onCommit={commitEdit}
              onCancel={cancelEdit}
              inputRef={inputRef}
            />
          ) : (
            <span className="truncate text-sidebar-foreground group-hover:text-foreground ml-1 flex-1 text-left">
              {req.name}
            </span>
          )}
          {mode === "idle" && (
            <>
              {examples.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExamples((p) => !p);
                  }}
                  className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 shrink-0"
                  title={`${examples.length} example${examples.length > 1 ? "s" : ""}`}
                >
                  <BookOpen className="h-3 w-3" />
                  <span className="text-[10px]">{examples.length}</span>
                </button>
              )}
              <HoverActions
                onEdit={(e) => {
                  e.stopPropagation();
                  startEdit();
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  setMode("confirming");
                }}
                onExport={(e) => {
                  e.stopPropagation();
                  onExport();
                }}
              />
            </>
          )}
        </div>
      )}
      {showExamples && examples.length > 0 && (
        <div className="ml-3 border-l border-sidebar-border/40 pl-1 pb-0.5">
          {examples.map((ex) => (
            <ExampleRow
              key={ex.id}
              example={ex}
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

function ExampleRow({
  example,
  onDelete,
  onRename,
  onClick,
}: {
  example: ApiExample;
  onDelete: () => void;
  onRename: (name: string) => void;
  onClick: () => void;
}) {
  const {
    mode,
    setMode,
    editValue,
    setEditValue,
    inputRef,
    startEdit,
    commitEdit,
    cancelEdit,
    confirmDelete,
  } = useRowActions(example.name, onRename, onDelete);

  const statusColor =
    example.response.status >= 200 && example.response.status < 300
      ? "text-emerald-500"
      : example.response.status >= 400
        ? "text-rose-500"
        : "text-amber-500";

  if (mode === "confirming") {
    return (
      <InlineDeleteConfirm
        label={`Delete "${example.name}"?`}
        onConfirm={confirmDelete}
        onCancel={cancelEdit}
      />
    );
  }

  return (
    <div
      role={mode === "idle" ? "button" : undefined}
      tabIndex={mode === "idle" ? 0 : undefined}
      onClick={mode === "idle" ? onClick : undefined}
      onKeyDown={(e) => mode === "idle" && e.key === "Enter" && onClick()}
      className="flex items-center group py-1 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-sm gap-1.5 cursor-pointer"
    >
      <span className={`text-[10px] font-bold w-8 shrink-0 ${statusColor}`}>
        {example.response.status}
      </span>
      {mode === "editing" ? (
        <InlineNameEdit
          value={editValue}
          onChange={setEditValue}
          onCommit={commitEdit}
          onCancel={cancelEdit}
          inputRef={inputRef}
          className="text-[11px]"
        />
      ) : (
        <span className="truncate flex-1">{example.name}</span>
      )}
      {mode === "idle" && (
        <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              startEdit();
            }}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Rename"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMode("confirming");
            }}
            className="p-0.5 rounded text-muted-foreground hover:text-destructive cursor-pointer"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const {
    collections,
    folders,
    requests,
    examples,
    openTab,
    openExampleTab,
    selectedTabId,
    activeTabs,
    saveRequest,
    saveFolder,
    deleteFolder,
    deleteRequest,
    saveExample,
    deleteExample,
    saveCollection,
    deleteCollection,
    selectSidebarItem,
    selectedSidebarItem,
    collapsedCollections,
    expandedFolders,
    toggleCollection,
    toggleFolder,
    setFolderExpanded,
    navigate,
  } = useStore((s) => ({
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
    saveCollection: s.saveCollection,
    deleteCollection: s.deleteCollection,
    selectSidebarItem: s.selectSidebarItem,
    selectedSidebarItem: s.selectedSidebarItem,
    collapsedCollections: s.collapsedCollections,
    expandedFolders: s.expandedFolders,
    toggleCollection: s.toggleCollection,
    toggleFolder: s.toggleFolder,
    setFolderExpanded: s.setFolderExpanded,
    navigate: s.navigate,
  }));

  const [search, setSearch] = useState("");

  const [showNewCollection, setShowNewCollection] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderCollectionId, setNewFolderCollectionId] = useState<
    string | undefined
  >();
  const [showImport, setShowImport] = useState(false);

  const [exportTarget, setExportTarget] = useState<{
    type: "collection" | "folder" | "request";
    id: string;
    name: string;
  } | null>(null);

  const dragReqId = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const isCollectionExpanded = (id: string) =>
    !collapsedCollections.includes(id);

  const lowerSearch = search.toLowerCase();
  const matchesSearch = (req: SavedRequest) =>
    !lowerSearch ||
    req.name.toLowerCase().includes(lowerSearch) ||
    req.url.toLowerCase().includes(lowerSearch) ||
    req.method.toLowerCase().includes(lowerSearch);

  const activeRequestId = activeTabs.find(
    (t) => t.id === selectedTabId,
  )?.requestId;

  const handleDragStart = (reqId: string) => {
    dragReqId.current = reqId;
  };
  const handleDragOver = (e: React.DragEvent, target: DropTarget) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(target);
  };
  const handleDrop = (e: React.DragEvent, target: DropTarget) => {
    e.preventDefault();
    const reqId = dragReqId.current;
    if (!reqId) return;
    const req = requests.find((r) => r.id === reqId);
    if (!req) return;
    saveRequest({
      ...req,
      collectionId: target.collectionId,
      folderId: target.kind === "folder" ? target.folderId : null,
      updatedAt: new Date().toISOString(),
    });
    dragReqId.current = null;
    setDropTarget(null);
    if (target.kind === "folder") setFolderExpanded(target.folderId, true);
  };
  const handleDragLeave = () => setDropTarget(null);
  const handleDragEnd = () => {
    dragReqId.current = null;
    setDropTarget(null);
  };
  const isDropTarget = (target: DropTarget) => {
    if (!dropTarget || dropTarget.kind !== target.kind) return false;
    if (target.kind === "folder")
      return (
        dropTarget.kind === "folder" && dropTarget.folderId === target.folderId
      );
    return dropTarget.collectionId === target.collectionId;
  };

  const handleRenameCollection = (collection: Collection, name: string) =>
    saveCollection({
      ...collection,
      name,
      updatedAt: new Date().toISOString(),
    });
  const handleRenameRequest = (req: SavedRequest, name: string) =>
    saveRequest({ ...req, name, updatedAt: new Date().toISOString() });
  const handleRenameFolder = (folder: Folder, name: string) =>
    saveFolder({ ...folder, name, updatedAt: new Date().toISOString() });
  const handleRenameExample = (exId: string, name: string) => {
    const ex = examples.find((e) => e.id === exId);
    if (ex) saveExample({ ...ex, name });
  };
  const handleDeleteCollection = (collectionId: string) => {
    const colFolders = folders.filter((f) => f.collectionId === collectionId);
    const colRequests = requests.filter((r) => r.collectionId === collectionId);
    colRequests.forEach((r) => {
      examples
        .filter((ex) => ex.requestId === r.id)
        .forEach((ex) => deleteExample(ex.id));
      deleteRequest(r.id);
    });
    colFolders.forEach((f) => {
      deleteFolder(f.id);
    });
    deleteCollection(collectionId);
  };
  const handleDeleteFolder = (folderId: string) => {
    const folderReqs = requests.filter((r) => r.folderId === folderId);
    folderReqs.forEach((r) => {
      examples
        .filter((ex) => ex.requestId === r.id)
        .forEach((ex) => deleteExample(ex.id));
      deleteRequest(r.id);
    });
    deleteFolder(folderId);
  };
  const handleDeleteRequest = (reqId: string) => {
    examples
      .filter((ex) => ex.requestId === reqId)
      .forEach((ex) => deleteExample(ex.id));
    deleteRequest(reqId);
  };

  const handleExportConfirm = () => {
    if (!exportTarget) return;

    const { type, id } = exportTarget;
    const exporter = getExporter();

    let exportResult;

    if (type === "collection") {
      const col = collections.find((c) => c.id === id);
      if (!col) return;

      const colFolders = folders.filter((f) => f.collectionId === id);
      const colRequests = requests.filter((r) => r.collectionId === id);

      const importedFolders = colFolders.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        parentFolderId: f.parentFolderId,
        config: f.config,
      }));

      const importedRequests = colRequests.map((r) => ({
        name: r.name,
        method: r.method,
        url: r.url,
        description: r.description,
        operationId: r.operationId,
        headers: r.headers,
        queryParams: r.queryParams,
        pathParams: r.pathParams,
        body: r.body,
        auth: r.auth,
        folderId: r.folderId,
      }));

      exportResult = exporter.exportCollection({
        name: col.name,
        description: col.description,
        config: col.config,
        folders: importedFolders,
        requests: importedRequests,
      });
    } else if (type === "folder") {
      const folder = folders.find((f) => f.id === id);
      if (!folder) return;

      const getChildFolders = (parentId: string): Folder[] => {
        const direct = folders.filter((f) => f.parentFolderId === parentId);
        return [...direct, ...direct.flatMap((f) => getChildFolders(f.id))];
      };

      const childFolders = getChildFolders(id);
      const allFolderIds = [id, ...childFolders.map((f) => f.id)];
      const folderRequests = requests.filter(
        (r) => r.folderId && allFolderIds.includes(r.folderId),
      );

      const importedFolder = {
        id: folder.id,
        name: folder.name,
        description: folder.description,
        parentFolderId: folder.parentFolderId,
        config: folder.config,
      };

      const importedChildFolders = childFolders.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        parentFolderId: f.parentFolderId,
        config: f.config,
      }));

      const importedRequests = folderRequests.map((r) => ({
        name: r.name,
        method: r.method,
        url: r.url,
        description: r.description,
        operationId: r.operationId,
        headers: r.headers,
        queryParams: r.queryParams,
        pathParams: r.pathParams,
        body: r.body,
        auth: r.auth,
        folderId: r.folderId,
      }));

      exportResult = exporter.exportFolder(
        importedFolder,
        importedChildFolders,
        importedRequests,
      );
    } else if (type === "request") {
      const req = requests.find((r) => r.id === id);
      if (!req) return;

      const importedRequest = {
        name: req.name,
        method: req.method,
        url: req.url,
        description: req.description,
        operationId: req.operationId,
        headers: req.headers,
        queryParams: req.queryParams,
        pathParams: req.pathParams,
        body: req.body,
        auth: req.auth,
      };

      exportResult = exporter.exportRequest(importedRequest);
    }

    if (exportResult) {
      const blob = new Blob([exportResult.content], {
        type: exportResult.mimeType,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    setExportTarget(null);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "i") {
        e.preventDefault();
        setShowImport(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-3 border-b border-sidebar-border space-y-2 shrink-0">
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search request"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-sidebar-search"
          />
        </InputGroup>

        <div className="flex gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1">
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                onClick={() => setShowNewCollection(true)}
                className="cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                New Collection
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setNewFolderCollectionId(collections[0]?.id);
                  setShowNewFolder(true);
                }}
                className="cursor-pointer"
              >
                <FolderPlus className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openTab()}
                className="cursor-pointer"
              >
                <FileCode className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                New Request
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowImport(true)}
            title="Import Request (ctrl/cmd+Shift+I)"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {collections.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            <p className="mb-2">No collections yet.</p>
            <p>
              Click <strong>New</strong> to create one.
            </p>
          </div>
        )}

        {collections.map((collection) => {
          const collectionFolders = folders.filter(
            (f) => f.collectionId === collection.id,
          );
          const rootRequests = requests
            .filter((r) => r.collectionId === collection.id && !r.folderId)
            .filter(matchesSearch);
          const folderMatches = collectionFolders.filter(
            (f) =>
              !lowerSearch ||
              f.name.toLowerCase().includes(lowerSearch) ||
              requests.filter((r) => r.folderId === f.id).some(matchesSearch),
          );
          const isExpanded = isCollectionExpanded(collection.id);
          const rootTarget: DropTarget = {
            kind: "root",
            collectionId: collection.id,
          };

          if (search && rootRequests.length === 0 && folderMatches.length === 0)
            return null;

          return (
            <div key={collection.id} className="mb-1">
              <CollectionRow
                collection={collection}
                isExpanded={isExpanded}
                isSelected={
                  selectedSidebarItem?.kind === "collection" &&
                  selectedSidebarItem?.id === collection.id
                }
                onToggle={() => toggleCollection(collection.id)}
                onSelect={() => {
                  if (navigate) {
                    navigate(`/workspace/${collection.id}`);
                  } else {
                    selectSidebarItem({
                      kind: "collection",
                      id: collection.id,
                    });
                    if (!isExpanded) toggleCollection(collection.id);
                  }
                }}
                onRename={(name) => handleRenameCollection(collection, name)}
                onDelete={() => handleDeleteCollection(collection.id)}
                onExport={() =>
                  setExportTarget({
                    type: "collection",
                    id: collection.id,
                    name: collection.name,
                  })
                }
              />

              {isExpanded && (
                <div className="ml-3 border-l border-sidebar-border/40 pl-1 mb-0.5">
                  {folderMatches.map((folder) => {
                    const folderExpanded = expandedFolders.includes(folder.id);
                    const folderReqs = requests
                      .filter((r) => r.folderId === folder.id)
                      .filter(matchesSearch);
                    const folderTarget: DropTarget = {
                      kind: "folder",
                      folderId: folder.id,
                      collectionId: collection.id,
                    };

                    return (
                      <div key={folder.id}>
                        <FolderRow
                          folder={folder}
                          isExpanded={folderExpanded}
                          isSelected={
                            selectedSidebarItem?.kind === "folder" &&
                            selectedSidebarItem?.id === folder.id
                          }
                          onToggle={() => toggleFolder(folder.id)}
                          onSelect={() => {
                            if (navigate) {
                              navigate(
                                `/workspace/${folder.collectionId}/folder/${folder.id}`,
                              );
                            } else {
                              selectSidebarItem({
                                kind: "folder",
                                id: folder.id,
                              });
                              if (!folderExpanded) toggleFolder(folder.id);
                            }
                          }}
                          onRename={(name) => handleRenameFolder(folder, name)}
                          onDelete={() => handleDeleteFolder(folder.id)}
                          onExport={() =>
                            setExportTarget({
                              type: "folder",
                              id: folder.id,
                              name: folder.name,
                            })
                          }
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
                                  {isDropTarget(folderTarget)
                                    ? "Drop here"
                                    : "Empty folder"}
                                </div>
                              )}
                              {folderReqs.map((req) => (
                                <RequestRow
                                  key={req.id}
                                  req={req}
                                  isActive={req.id === activeRequestId}
                                  onClick={() => {
                                    if (navigate) {
                                      navigate(
                                        `/workspace/${req.collectionId}/folder/${req.folderId}/request/${req.id}`,
                                      );
                                    } else {
                                      openTab(req);
                                    }
                                  }}
                                  onDragStart={() => handleDragStart(req.id)}
                                  onDragEnd={handleDragEnd}
                                  onRename={(name) =>
                                    handleRenameRequest(req, name)
                                  }
                                  onDelete={() => handleDeleteRequest(req.id)}
                                  examples={examples.filter(
                                    (ex) => ex.requestId === req.id,
                                  )}
                                  onDeleteExample={deleteExample}
                                  onRenameExample={handleRenameExample}
                                  onClickExample={(ex) => openExampleTab(ex.id)}
                                  onExport={() =>
                                    setExportTarget({
                                      type: "request",
                                      id: req.id,
                                      name: req.name,
                                    })
                                  }
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
                      <div className="py-1.5 px-2 text-xs text-muted-foreground italic">
                        Drop here
                      </div>
                    )}
                    {rootRequests.map((req) => (
                      <RequestRow
                        key={req.id}
                        req={req}
                        isActive={req.id === activeRequestId}
                        onClick={() => {
                          if (navigate) {
                            navigate(
                              `/workspace/${req.collectionId}/request/${req.id}`,
                            );
                          } else {
                            openTab(req);
                          }
                        }}
                        onDragStart={() => handleDragStart(req.id)}
                        onDragEnd={handleDragEnd}
                        onRename={(name) => handleRenameRequest(req, name)}
                        onDelete={() => handleDeleteRequest(req.id)}
                        examples={examples.filter(
                          (ex) => ex.requestId === req.id,
                        )}
                        onDeleteExample={deleteExample}
                        onRenameExample={handleRenameExample}
                        onClickExample={(ex) => openExampleTab(ex.id)}
                        onExport={() =>
                          setExportTarget({
                            type: "request",
                            id: req.id,
                            name: req.name,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <NewCollectionDialog
        open={showNewCollection}
        onClose={() => setShowNewCollection(false)}
      />
      <NewFolderDialog
        open={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        defaultCollectionId={newFolderCollectionId}
      />
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
      {exportTarget && (
        <ExportConfirmationDialog
          open={!!exportTarget}
          target={exportTarget}
          onClose={() => setExportTarget(null)}
          onConfirm={handleExportConfirm}
        />
      )}
    </div>
  );
}
