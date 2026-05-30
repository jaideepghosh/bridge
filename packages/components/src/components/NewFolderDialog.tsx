import { useState, useEffect } from "react";
import { useStore } from "../context/app-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@bridge/ui/dialog";
import { Button } from "@bridge/ui/button";
import { Input } from "@bridge/ui/input";
import { Label } from "@bridge/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@bridge/ui/select";
import { Folder } from "../types";
import { v4 as uuidv4 } from "uuid";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultCollectionId?: string;
};

export function NewFolderDialog({ open, onClose, defaultCollectionId }: Props) {
  const { collections, saveFolder } = useStore(s => ({ collections: s.collections, saveFolder: s.saveFolder }));
  const [name, setName] = useState("");
  const [collectionId, setCollectionId] = useState(defaultCollectionId ?? "");

  useEffect(() => {
    if (open) {
      setName("");
      setCollectionId(defaultCollectionId ?? collections[0]?.id ?? "");
    }
  }, [open, defaultCollectionId, collections]);

  const handleCreate = () => {
    if (!name.trim() || !collectionId) return;
    const folder: Folder = {
      id: uuidv4(),
      name: name.trim(),
      collectionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveFolder(folder);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name" className="text-xs font-semibold">Folder Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Auth, Payments, Users…"
              className="h-9"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
          </div>
          {collections.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Collection</Label>
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || !collectionId}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
