import { useState, useEffect, useRef } from "react";
import { useStore } from "../context/app-store";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@bridge/ui";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  SlidersHorizontal,
  Check,
  Circle,
  AlertCircle,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Environment, EnvironmentVariable } from "../types";

export function EnvironmentManager() {
  const environments = useStore((s) => s.environments);
  const activeEnvironmentId = useStore((s) => s.activeEnvironmentId);
  const setActiveEnvironmentId = useStore((s) => s.setActiveEnvironmentId);
  const saveEnvironment = useStore((s) => s.saveEnvironment);
  const deleteEnvironment = useStore((s) => s.deleteEnvironment);

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const wasOpenRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync selectedEnvId when dialog opens
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (
        activeEnvironmentId &&
        environments.some((e) => e.id === activeEnvironmentId)
      ) {
        setSelectedEnvId(activeEnvironmentId);
      } else if (environments.length > 0) {
        setSelectedEnvId(environments[0]?.id || null);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, activeEnvironmentId, environments]);

  // Keep selectedEnvId valid
  useEffect(() => {
    const envExists = environments.some((e) => e.id === selectedEnvId);
    if (!selectedEnvId || !envExists) {
      if (
        activeEnvironmentId &&
        environments.some((e) => e.id === activeEnvironmentId)
      ) {
        setSelectedEnvId(activeEnvironmentId);
      } else if (environments.length > 0) {
        setSelectedEnvId(environments[0]?.id || null);
      } else {
        setSelectedEnvId(null);
      }
    }
  }, [environments, activeEnvironmentId, selectedEnvId]);

  const selectedEnv = environments.find((e) => e.id === selectedEnvId);

  const handleCreateEnv = () => {
    const newEnv: Environment = {
      id: uuidv4(),
      name: "New Environment",
      variables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveEnvironment(newEnv);
    setSelectedEnvId(newEnv.id);
  };

  const updateSelectedEnv = (updates: Partial<Environment>) => {
    if (!selectedEnv) return;
    saveEnvironment({
      ...selectedEnv,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  };

  const addVariable = () => {
    if (!selectedEnv) return;
    const newVar: EnvironmentVariable = {
      id: uuidv4(),
      key: "",
      initialValue: "",
      currentValue: "",
      enabled: true,
      isSecret: false,
    };
    updateSelectedEnv({ variables: [...selectedEnv.variables, newVar] });
  };

  const updateVariable = (
    id: string,
    updates: Partial<EnvironmentVariable>,
  ) => {
    if (!selectedEnv) return;
    updateSelectedEnv({
      variables: selectedEnv.variables.map((v) =>
        v.id === id ? { ...v, ...updates } : v,
      ),
    });
  };

  const removeVariable = (id: string) => {
    if (!selectedEnv) return;
    updateSelectedEnv({
      variables: selectedEnv.variables.filter((v) => v.id !== id),
    });
  };

  return (
    <div className="flex items-center gap-0">
      {/* ── Environment selector + Manage — grouped as one unit ── */}
      <div className="flex items-center h-8 rounded-md border border-border bg-background shadow-sm">
        {/* Custom dropdown trigger */}
        <div
          className="relative rounded-l-md overflow-visible"
          ref={dropdownRef}
        >
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            className="flex items-center gap-2 h-8 pl-2.5 pr-2 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors min-w-[140px] max-w-[180px]"
          >
            {activeEnv ? (
              <>
                <span
                  className={"h-1.5 w-1.5 rounded-full shrink-0 bg-sky-400"}
                />
                <span className="truncate">{activeEnv.name}</span>
              </>
            ) : (
              <>
                <Circle className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <span className="text-muted-foreground">No Environment</span>
              </>
            )}
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground ml-auto shrink-0 transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown panel */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 animate-in fade-in-0 zoom-in-95 duration-100">
              {/* Label */}
              <div className="px-3 pt-1 pb-1.5">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                  Environment
                </span>
              </div>

              {/* No Environment option */}
              <button
                onClick={() => {
                  setActiveEnvironmentId(null);
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
                  !activeEnvironmentId
                    ? "text-foreground bg-muted/50"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <Circle className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
                <span>No Environment</span>
                {!activeEnvironmentId && (
                  <Check className="h-3 w-3 ml-auto text-primary" />
                )}
              </button>

              {/* Environment list */}
              {environments.length > 0 && (
                <div className="mt-0.5">
                  {environments.map((env) => (
                    <button
                      key={env.id}
                      onClick={() => {
                        setActiveEnvironmentId(env.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
                        activeEnvironmentId === env.id
                          ? "text-foreground bg-muted/50"
                          : "text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <span
                        className={"h-2 w-2 rounded-full shrink-0 bg-sky-400"}
                      />
                      <span className="truncate flex-1 text-left">
                        {env.name}
                      </span>
                      {activeEnvironmentId === env.id && (
                        <Check className="h-3 w-3 ml-auto text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Divider + New environment */}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setIsOpen(true);
                    handleCreateEnv();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  <Plus className="h-3 w-3 shrink-0" />
                  New environment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-border shrink-0" />

        {/* Manage button */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Manage</span>
            </button>
          </DialogTrigger>

          {/* ── Manage Environments Dialog ── */}
          <DialogContent className="max-w-full lg:max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden gap-0 border-border bg-background">
            <DialogHeader className="shrink-0 px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-semibold text-foreground leading-none">
                    Environments
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Manage variables and switch between environments
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* ── Sidebar ── */}
              <div className="w-56 shrink-0 border-r border-border flex flex-col bg-muted/20">
                <div className="p-2 border-b border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateEnv}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 shrink-0" />
                    New environment
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {environments.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/50 text-center py-4 px-3">
                      No environments yet
                    </p>
                  ) : (
                    <Tabs
                      orientation="vertical"
                      value={selectedEnvId ?? ""}
                      onValueChange={setSelectedEnvId}
                      className="w-full"
                    >
                      <TabsList className="h-auto w-full flex-col items-stretch bg-transparent p-0 gap-1">
                        {environments.map((env) => (
                          <TabsTrigger
                            key={env.id}
                            value={env.id}
                            className="gap-2.5"
                          >
                            <span className="h-2 w-2 rounded-full shrink-0 bg-sky-400" />

                            <span className="truncate flex-1 text-left">
                              {env.name}
                            </span>

                            {activeEnvironmentId === env.id && (
                              <span className="text-[9px] font-semibold tracking-wide uppercase text-primary shrink-0">
                                Active
                              </span>
                            )}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  )}
                </div>
              </div>

              {/* ── Main Content ── */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {selectedEnv ? (
                  <>
                    {/* Env header */}
                    <div className="shrink-0 px-5 py-3 border-b border-border flex items-center justify-between gap-4 bg-background">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={
                            "h-2.5 w-2.5 rounded-full shrink-0 bg-sky-400"
                          }
                        />
                        <Input
                          value={selectedEnv.name}
                          onChange={(e) =>
                            updateSelectedEnv({ name: e.target.value })
                          }
                          className="h-8 text-sm font-semibold border-transparent bg-transparent px-0 focus-visible:border-border focus-visible:bg-background focus-visible:px-2 transition-all max-w-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {activeEnvironmentId !== selectedEnv.id && (
                          <Button
                            onClick={() =>
                              setActiveEnvironmentId(selectedEnv.id)
                            }
                            size="sm"
                            variant="outline"
                          >
                            <Check className="h-3 w-3" />
                            Set active
                          </Button>
                        )}
                        <Button
                          onClick={() => deleteEnvironment(selectedEnv.id)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Variables table */}
                    <div className="flex-1 overflow-y-auto">
                      {selectedEnv.variables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium text-foreground">
                              No variables
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Add variables to use in requests as{" "}
                              <span className="font-mono text-amber-600 dark:text-amber-400">
                                {"{{VAR}}"}
                              </span>
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addVariable}
                          >
                            <Plus className="h-3 w-3" />
                            Add variable
                          </Button>
                        </div>
                      ) : (
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="w-8 px-3 py-2.5 text-center">
                                <span className="sr-only">Enabled</span>
                              </th>
                              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground tracking-wide uppercase text-[10px]">
                                Variable
                              </th>
                              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground tracking-wide uppercase text-[10px]">
                                Initial value
                              </th>
                              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground tracking-wide uppercase text-[10px]">
                                Current value
                              </th>
                              <th className="w-12 px-3 py-2.5 text-center font-semibold text-muted-foreground tracking-wide uppercase text-[10px]">
                                Secret
                              </th>
                              <th className="w-10" />
                            </tr>
                          </thead>
                          <tbody>
                            {selectedEnv.variables.map((v, i) => (
                              <tr
                                key={v.id}
                                className={`group border-b border-border last:border-0 transition-colors ${
                                  !v.enabled ? "opacity-50" : ""
                                } ${i % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                              >
                                {/* Enable toggle */}
                                <td className="px-3 py-1.5 text-center">
                                  <Input
                                    type="checkbox"
                                    checked={v.enabled}
                                    onChange={(e) =>
                                      updateVariable(v.id, {
                                        enabled: e.target.checked,
                                      })
                                    }
                                  />
                                </td>
                                {/* Key */}
                                <td className="px-2 py-1.5">
                                  <Input
                                    value={v.key}
                                    onChange={(e) =>
                                      updateVariable(v.id, {
                                        key: e.target.value,
                                      })
                                    }
                                    placeholder="VARIABLE_NAME"
                                  />
                                </td>
                                {/* Initial value */}
                                <td className="px-2 py-1.5">
                                  <Input
                                    value={v.initialValue}
                                    onChange={(e) =>
                                      updateVariable(v.id, {
                                        initialValue: e.target.value,
                                      })
                                    }
                                    type={v.isSecret ? "password" : "text"}
                                    placeholder="—"
                                  />
                                </td>
                                {/* Current value */}
                                <td className="px-2 py-1.5">
                                  <Input
                                    value={v.currentValue}
                                    onChange={(e) =>
                                      updateVariable(v.id, {
                                        currentValue: e.target.value,
                                      })
                                    }
                                    type={v.isSecret ? "password" : "text"}
                                    placeholder="—"
                                  />
                                </td>
                                {/* Secret toggle */}
                                <td className="px-3 py-1.5 text-center">
                                  <Button
                                    size="sm"
                                    variant={`${v.isSecret ? "destructive" : "outline"}`}
                                    onClick={() =>
                                      updateVariable(v.id, {
                                        isSecret: !v.isSecret,
                                      })
                                    }
                                    title={
                                      v.isSecret ? "Hide value" : "Show value"
                                    }
                                  >
                                    {v.isSecret ? (
                                      <EyeOff className="h-3.5 w-3.5" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </td>
                                {/* Delete */}
                                <td className="px-2 py-1.5 text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeVariable(v.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Table footer — add variable */}
                    {selectedEnv.variables.length > 0 && (
                      <div className="shrink-0 px-4 py-2.5 border-t border-border bg-muted/10">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={addVariable}
                        >
                          <Plus className="h-3 w-3" />
                          Add variable
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <SlidersHorizontal className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        No environment selected
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Create or select an environment from the sidebar
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
