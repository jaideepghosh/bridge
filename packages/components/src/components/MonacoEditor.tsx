import Editor, { EditorProps } from "@monaco-editor/react";
import { useTheme } from "next-themes";

interface MonacoEditorProps extends EditorProps {
  minimal?: boolean;
}

export function MonacoEditor({ minimal = false, ...props }: MonacoEditorProps) {
  const { theme } = useTheme();

  return (
    <Editor
      theme={theme === "dark" ? "vs-dark" : "light"}
      options={{
        minimap: { enabled: !minimal },
        lineNumbers: minimal ? "off" : "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        folding: true,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        padding: { top: 12, bottom: 12 },
        ...props.options,
      }}
      {...props}
    />
  );
}
