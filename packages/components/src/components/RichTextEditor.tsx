import React, { useRef, useEffect, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link as LinkIcon, Quote, Code, Undo, Redo, Eraser,
  Eye, Code2, Edit3, Heading1, Heading2, Heading3
} from "lucide-react";
import { Button } from "@bridge/ui";
import { MonacoEditor } from "./MonacoEditor";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write description here...",
  className = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "code">("edit");
  const lastValueRef = useRef(value);

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    insertUnorderedList: false,
    insertOrderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
  });

  const [activeBlock, setActiveBlock] = useState("p");

  // Keep editor content in sync when value changes externally or when editor is re-mounted
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
      lastValueRef.current = value;
    }
  }, [value, viewMode]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
  };

  const executeCommand = (command: string, arg: string = "") => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    handleInput();
    checkStates();
  };

  const checkStates = () => {
    if (typeof document === "undefined" || !editorRef.current) return;
    
    // Check basic formats
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
    });

    // Check active block element
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    let node = selection.getRangeAt(0).startContainer;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = (node as Element).tagName.toLowerCase();
        if (["h1", "h2", "h3", "p", "blockquote", "pre"].includes(tagName)) {
          setActiveBlock(tagName);
          return;
        }
      }
      node = (node.parentNode as Node) || null;
    }
    setActiveBlock("p");
  };

  const insertLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const clearFormatting = () => {
    executeCommand("removeFormat");
    executeCommand("formatBlock", "<p>");
  };

  return (
    <div className={`flex flex-col border border-border rounded-md overflow-hidden bg-card h-full min-h-[200px] ${className}`}>
      {/* Styles injector for premium layout styling */}
      <style>{`
        .rich-editor-content {
          outline: none;
          min-height: 150px;
        }
        .rich-editor-content h1 {
          font-size: 1.6rem;
          font-weight: 700;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: hsl(var(--foreground));
        }
        .rich-editor-content h2 {
          font-size: 1.35rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.375rem;
          color: hsl(var(--foreground));
        }
        .rich-editor-content h3 {
          font-size: 1.15rem;
          font-weight: 500;
          margin-top: 0.75rem;
          margin-bottom: 0.25rem;
          color: hsl(var(--foreground));
        }
        .rich-editor-content p {
          margin-bottom: 0.5rem;
          line-height: 1.6;
          color: hsl(var(--foreground));
        }
        .rich-editor-content blockquote {
          border-left: 4px solid hsl(var(--primary));
          background-color: hsl(var(--muted)/0.3);
          padding: 0.5rem 1rem;
          font-style: italic;
          margin: 0.75rem 0;
          border-radius: 0 4px 4px 0;
        }
        .rich-editor-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .rich-editor-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .rich-editor-content pre {
          background-color: hsl(var(--muted));
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          overflow-x: auto;
          border: 1px solid hsl(var(--border));
          margin: 0.75rem 0;
        }
        .rich-editor-content code {
          background-color: hsl(var(--muted));
          padding: 0.15rem 0.3rem;
          border-radius: 0.25rem;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          border: 1px solid hsl(var(--border)/0.5);
        }
        .rich-editor-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
        }
        .rich-editor-content:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground)/0.7);
          pointer-events: none;
        }
      `}</style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-border bg-muted/20 gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1">
          {viewMode === "edit" ? (
            <>
              {/* Heading Selection */}
              <div className="flex items-center gap-0.5 mr-2 border-r border-border/80 pr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeBlock === "h1" ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("formatBlock", activeBlock === "h1" ? "<p>" : "<h1>")}
                  title="Heading 1"
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeBlock === "h2" ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("formatBlock", activeBlock === "h2" ? "<p>" : "<h2>")}
                  title="Heading 2"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeBlock === "h3" ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("formatBlock", activeBlock === "h3" ? "<p>" : "<h3>")}
                  title="Heading 3"
                >
                  <Heading3 className="h-4 w-4" />
                </Button>
              </div>

              {/* Text formatting */}
              <div className="flex items-center gap-0.5 mr-2 border-r border-border/80 pr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeFormats.bold ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("bold")}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeFormats.italic ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("italic")}
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeFormats.underline ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("underline")}
                  title="Underline"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeFormats.strikeThrough ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("strikeThrough")}
                  title="Strikethrough"
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeBlock === "pre" ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("formatBlock", activeBlock === "pre" ? "<p>" : "<pre>")}
                  title="Code block"
                >
                  <Code className="h-4 w-4" />
                </Button>
              </div>

              {/* Lists & Blocks */}
              <div className="flex items-center gap-0.5 mr-2 border-r border-border/80 pr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeFormats.insertUnorderedList ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("insertUnorderedList")}
                  title="Bullet List"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeFormats.insertOrderedList ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("insertOrderedList")}
                  title="Numbered List"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeBlock === "blockquote" ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("formatBlock", activeBlock === "blockquote" ? "<p>" : "<blockquote>")}
                  title="Quote block"
                >
                  <Quote className="h-4 w-4" />
                </Button>
              </div>

              {/* Alignments */}
              <div className="flex items-center gap-0.5 mr-2 border-r border-border/80 pr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeFormats.justifyLeft ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("justifyLeft")}
                  title="Align Left"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeFormats.justifyCenter ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("justifyCenter")}
                  title="Align Center"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeFormats.justifyRight ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("justifyRight")}
                  title="Align Right"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${activeFormats.justifyFull ? "bg-muted text-primary font-bold border" : "text-muted-foreground"}`}
                  onClick={() => executeCommand("justifyFull")}
                  title="Justify"
                >
                  <AlignJustify className="h-4 w-4" />
                </Button>
              </div>

              {/* Insertion & Actions */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-muted-foreground"
                  onClick={insertLink}
                  title="Link"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-muted-foreground"
                  onClick={() => executeCommand("insertHorizontalRule")}
                  title="Horizontal Rule"
                >
                  <span className="text-xs font-bold font-mono">HR</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-muted-foreground"
                  onClick={clearFormatting}
                  title="Clear formatting"
                >
                  <Eraser className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-muted-foreground"
                  onClick={() => executeCommand("undo")}
                  title="Undo"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-muted-foreground"
                  onClick={() => executeCommand("redo")}
                  title="Redo"
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-xs font-semibold text-muted-foreground px-2">
              {viewMode === "preview" ? "Preview Mode (Read-only)" : "HTML Source Code Editor"}
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2.5 text-xs font-medium rounded-md gap-1 cursor-pointer transition-all ${viewMode === "edit" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewMode("edit")}
          >
            <Edit3 className="h-3 w-3" />
            <span>Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2.5 text-xs font-medium rounded-md gap-1 cursor-pointer transition-all ${viewMode === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewMode("preview")}
          >
            <Eye className="h-3 w-3" />
            <span>Preview</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2.5 text-xs font-medium rounded-md gap-1 cursor-pointer transition-all ${viewMode === "code" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewMode("code")}
          >
            <Code2 className="h-3 w-3" />
            <span>HTML</span>
          </Button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto relative min-h-0">
        {viewMode === "edit" && (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyUp={checkStates}
            onMouseUp={checkStates}
            onFocus={checkStates}
            className="rich-editor-content p-4 min-h-full font-sans text-sm selection:bg-primary/20 focus:outline-none"
            data-placeholder={placeholder}
          />
        )}
        
        {viewMode === "preview" && (
          <div
            className="rich-editor-content p-4 min-h-full font-sans text-sm prose dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: value || `<p class="text-muted-foreground/60 italic">${placeholder}</p>` }}
          />
        )}

        {viewMode === "code" && (
          <div className="absolute inset-0 h-full w-full">
            <MonacoEditor
              value={value}
              onChange={(val) => onChange(val || "")}
              language="html"
              minimal
            />
          </div>
        )}
      </div>
    </div>
  );
}
