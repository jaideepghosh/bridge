import { useState } from "react";
import { useStore } from "../context/app-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@bridge/ui/dialog";
import { Button } from "@bridge/ui/button";
import { Input } from "@bridge/ui/input";
import { Label } from "@bridge/ui/label";
import { Collection } from "../types";
import { v4 as uuidv4 } from "uuid";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NewCollectionDialog({ open, onClose }: Props) {
  const saveCollection = useStore((s) => s.saveCollection);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    const col: Collection = {
      id: uuidv4(),
      name: name.trim(),
      description: description.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveCollection(col);
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="col-name" className="text-xs font-semibold">
              Collection Name
            </Label>
            <Input
              id="col-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My APIs"
              className="h-9"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="col-desc"
              className="text-xs font-semibold text-muted-foreground"
            >
              Description (optional)
            </Label>
            <Input
              id="col-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this collection contains"
              className="h-9"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
