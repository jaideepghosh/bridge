import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@bridge/ui/dialog";
import { Button } from "@bridge/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  target: {
    type: "collection" | "folder" | "request";
    name: string;
  };
};

export function ExportConfirmationDialog({
  open,
  onClose,
  onConfirm,
  target,
}: Props) {
  const getTitle = () => {
    switch (target.type) {
      case "collection":
        return "Export Collection";
      case "folder":
        return "Export Folder";
      case "request":
        return "Export Request";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground break-all">
            {target.name}
          </span>{" "}
          will be exported as a JSON file.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
