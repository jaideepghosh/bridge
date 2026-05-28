import { useState } from "react";
import { useStore } from "@/store";
import { Button } from "@payable-turborepo-starter/ui/button";
import { Input } from "@payable-turborepo-starter/ui/input";
import { Label } from "@payable-turborepo-starter/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@payable-turborepo-starter/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@payable-turborepo-starter/ui/select";
import { SavedRequest, ActiveTab } from "@/types";
import { v4 as uuidv4 } from "uuid";

type Props = {
  open: boolean;
  onClose: () => void;
  tab: ActiveTab;
};

export function SaveRequestDialog({ open, onClose, tab }: Props) {
  const { collections, folders, saveRequest } = useStore();
  const [name, setName] = useState(tab.draft.name);
  const [collectionId, setCollectionId] = useState(collections[0]?.id || "");
  const [folderId, setFolderId] = useState<string>("none");

  const availableFolders = folders.filter(f => f.collectionId === collectionId);

  const handleSave = () => {
    if (!name.trim() || !collectionId) return;

    const req: SavedRequest = {
      id: tab.requestId || uuidv4(),
      name: name.trim(),
      method: tab.draft.method,
      url: tab.draft.url,
      headers: tab.draft.headers,
      queryParams: tab.draft.queryParams,
      body: tab.draft.body,
      auth: tab.draft.auth,
      collectionId,
      folderId: folderId === "none" ? null : folderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveRequest(req);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="req-name" className="text-xs font-semibold">Request Name</Label>
            <Input
              id="req-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Request"
              className="h-9 font-mono text-sm"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Collection</Label>
            {collections.length === 0 ? (
              <p className="text-xs text-muted-foreground">No collections yet. Create one first.</p>
            ) : (
              <Select value={collectionId} onValueChange={v => { setCollectionId(v); setFolderId("none"); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {availableFolders.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Folder (optional)</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="No folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {availableFolders.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || !collectionId}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
