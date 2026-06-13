import { useState, useMemo, useCallback } from "react";
import { Code2, Copy, Check, WrapText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bridge/ui";
import { createDefaultRegistry } from "@bridge/codegen";
import type { RequestDefinition } from "@bridge/codegen";
import { MonacoEditor } from "./MonacoEditor";

const registry = createDefaultRegistry();
const generators = registry.getAll();

interface CodeGeneratorDialogProps {
  request: RequestDefinition;
}

export function CodeGeneratorDialog({ request }: CodeGeneratorDialogProps) {
  const [selectedId, setSelectedId] = useState(generators[0]?.id ?? "curl");
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  const generator = useMemo(() => registry.get(selectedId), [selectedId]);

  const code = useMemo(() => {
    if (!generator) return "";
    return generator.generate(request);
  }, [generator, request]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Generate code snippet">
          <Code2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-full lg:max-w-4xl h-[520px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold">
              Generate Code
            </DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generators.map((gen) => (
                    <SelectItem key={gen.id} value={gen.id} className="text-xs">
                      {gen.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setWordWrap((w) => !w)}
                title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
              >
                <WrapText
                  className={`h-3.5 w-3.5 ${wordWrap ? "text-primary" : "text-muted-foreground"}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <MonacoEditor
            language={generator?.language ?? "plaintext"}
            value={code}
            options={{
              readOnly: true,
              wordWrap: wordWrap ? "on" : "off",
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              fontSize: 12,
              padding: { top: 12, bottom: 12 },
            }}
            height="100%"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
