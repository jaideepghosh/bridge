import { useState } from "react";
import { useStore } from "@/store";
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@bridge/ui";

import { ActiveTab, ProxyResponse, ApiExample } from "@/types";
import { v4 as uuidv4 } from "uuid";

type Props = {
  open: boolean;
  onClose: () => void;
  tab: ActiveTab;
  response: ProxyResponse;
};

export function SaveExampleDialog({ open, onClose, tab, response }: Props) {
  const { saveExample, saveRequest, collections } = useStore();
  const [name, setName] = useState(`${response.status} ${response.statusText}`);

  const handleSave = () => {
    if (!name.trim()) return;

    let requestId = tab.requestId;

    // If the tab has no saved request yet, we need a requestId
    if (!requestId) {
      const firstCollection = collections[0];
      if (!firstCollection) return;
      const newReq = {
        id: uuidv4(),
        name: tab.draft.name,
        method: tab.draft.method,
        url: tab.draft.url,
        headers: tab.draft.headers,
        queryParams: tab.draft.queryParams,
        body: tab.draft.body,
        auth: tab.draft.auth,
        collectionId: firstCollection.id,
        folderId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveRequest(newReq);
      requestId = newReq.id;
    }

    const example: ApiExample = {
      id: uuidv4(),
      requestId: requestId!,
      name: name.trim(),
      request: {
        id: requestId!,
        name: tab.draft.name,
        method: tab.draft.method,
        url: tab.draft.url,
        headers: tab.draft.headers,
        queryParams: tab.draft.queryParams,
        body: tab.draft.body,
        auth: tab.draft.auth,
        collectionId: collections[0]?.id || "",
        folderId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body,
        durationMs: response.durationMs,
        size: response.size,
        contentType: response.contentType,
      },
      createdAt: new Date().toISOString(),
    };

    saveExample(example);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save as Example</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            Saves this request + response pair as a reusable example for documentation.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="example-name" className="text-xs font-semibold">Example Name</Label>
            <Input
              id="example-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="200 OK"
              className="h-9 font-mono text-sm"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
          </div>
          <div className="bg-muted/30 rounded-md p-3 text-xs font-mono space-y-1">
            <div><span className="text-muted-foreground">method:</span> {tab.draft.method}</div>
            <div><span className="text-muted-foreground">status:</span> {response.status} {response.statusText}</div>
            <div><span className="text-muted-foreground">duration:</span> {response.durationMs}ms</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Save Example</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
