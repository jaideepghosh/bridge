import { useRef, useState, useCallback } from "react";
import { Environment } from "../../types";

type Segment = { text: string; isVar: boolean; varName: string };

function parseSegments(url: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(url)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: url.slice(lastIndex, match.index),
        isVar: false,
        varName: "",
      });
    }
    segments.push({ text: match[0], isVar: true, varName: match[1] ?? "" });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < url.length) {
    segments.push({ text: url.slice(lastIndex), isVar: false, varName: "" });
  }
  return segments;
}

function resolveVar(varName: string, env: Environment | null): string | null {
  if (!env) return null;
  const v = env.variables.find((v) => v.key === varName && v.enabled);
  if (!v) return null;
  return v.currentValue || v.initialValue || null;
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  env: Environment | null;
  placeholder?: string;
  disabled?: boolean;
};

export function UrlInput({
  value,
  onChange,
  onKeyDown,
  env,
  placeholder,
  disabled,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hoveredVar, setHoveredVar] = useState<{
    name: string;
    resolvedValue: string | null;
    x: number;
    y: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const segments = parseSegments(value);
  const hasVars = segments.some((s) => s.isVar);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLInputElement>) => {
      if (!hasVars || !inputRef.current) return;

      const input = inputRef.current;
      const rect = input.getBoundingClientRect();
      const relX = e.clientX - rect.left;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const computed = window.getComputedStyle(input);
      ctx.font = `${computed.fontSize} ${computed.fontFamily}`;

      const paddingLeft = parseFloat(computed.paddingLeft);
      let charX = paddingLeft;
      let foundVar: { name: string; resolvedValue: string | null } | null =
        null;

      for (const seg of segments) {
        const segWidth = ctx.measureText(seg.text).width;
        if (relX >= charX && relX <= charX + segWidth) {
          if (seg.isVar) {
            foundVar = {
              name: seg.varName,
              resolvedValue: resolveVar(seg.varName, env),
            };
          }
          break;
        }
        charX += segWidth;
      }

      if (foundVar) {
        setHoveredVar({
          name: foundVar.name,
          resolvedValue: foundVar.resolvedValue,
          x: e.clientX,
          y: e.clientY,
        });
      } else {
        setHoveredVar(null);
      }
    },
    [segments, hasVars, env],
  );

  const handleMouseLeave = () => setHoveredVar(null);

  return (
    <div ref={containerRef} className="relative flex-1">
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center px-3 pointer-events-none overflow-hidden font-mono text-sm select-none"
      >
        {segments.map((seg, i) =>
          seg.isVar ? (
            <span
              key={i}
              className="bg-amber-400/20 text-amber-400 border border-amber-400/40 rounded px-0.5 mx-[-3px] whitespace-pre"
            >
              {seg.text}
            </span>
          ) : (
            <span
              key={i}
              className={`${hasVars ? "text-foreground" : "text-transparent"} whitespace-pre`}
            >
              {seg.text}
            </span>
          ),
        )}
      </div>

      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setHoveredVar(null);
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        disabled={disabled}
        className={[
          "w-full h-9 px-3 font-mono text-sm rounded-md border border-input",
          "bg-muted/20 focus:bg-background",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          "transition-colors",
          hasVars ? "text-transparent" : "",
          disabled ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
        style={{ caretColor: "hsl(var(--foreground))" }}
      />

      {hoveredVar && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{ left: hoveredVar.x + 10, top: hoveredVar.y + 14 }}
        >
          <div className="bg-popover border border-border rounded-md shadow-xl px-3 py-2 text-xs min-w-[180px]">
            <div className="font-mono text-amber-400 font-semibold mb-1">{`{{${hoveredVar.name}}}`}</div>
            {hoveredVar.resolvedValue != null ? (
              <div className="font-mono text-foreground break-all">
                {hoveredVar.resolvedValue}
              </div>
            ) : (
              <div className="text-muted-foreground italic">
                {env
                  ? "Variable not found in environment"
                  : "No environment selected"}
              </div>
            )}
            {env && (
              <div className="text-muted-foreground mt-1 text-[10px]">
                from {env.name}
              </div>
            )}
          </div>
        </div>
      )}

      {focused && hasVars && segments.filter((s) => s.isVar).length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-xs flex flex-col gap-1 min-w-[240px]">
          <div className="text-muted-foreground font-semibold mb-0.5 text-[10px] uppercase tracking-wide">
            Variables in request
          </div>
          {segments
            .filter((s) => s.isVar)
            .map((seg, i) => {
              const resolved = resolveVar(seg.varName, env);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-mono text-amber-400">{seg.text}</span>
                  <span className="text-muted-foreground">→</span>
                  <span
                    className={`font-mono truncate max-w-[200px] ${resolved ? "text-foreground" : "text-muted-foreground italic"}`}
                  >
                    {resolved ?? (env ? "(not set)" : "no environment")}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
