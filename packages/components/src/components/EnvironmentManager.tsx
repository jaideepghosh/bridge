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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bridge/ui";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Environment, EnvironmentVariable } from "../types";

export function EnvironmentManager() {
  const environments = useStore((s) => s.environments);
  const activeEnvironmentId = useStore((s) => s.activeEnvironmentId);
  const setActiveEnvironmentId = useStore((s) => s.setActiveEnvironmentId);
  const saveEnvironment = useStore((s) => s.saveEnvironment);
  const deleteEnvironment = useStore((s) => s.deleteEnvironment);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  // Sync selectedEnvId to the active environment or first environment when the dialog is opened
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

  // Keep selectedEnvId valid (e.g. if the selected environment gets deleted or list loads)
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
    <div className="flex items-center space-x-2">
      <Select
        value={activeEnvironmentId || "none"}
        onValueChange={(v) => setActiveEnvironmentId(v === "none" ? null : v)}
      >
        <SelectTrigger className="w-[200px] h-8 text-xs font-medium">
          <SelectValue placeholder="No Environment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Environment</SelectItem>
          {environments.map((env) => (
            <SelectItem key={env.id} value={env.id}>
              {env.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Eye className="h-4 w-4 mr-1" />
            Manage
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-full lg:max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Manage Environments</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r flex flex-col bg-muted/30">
              <div className="p-2 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={handleCreateEnv}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Environment
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {environments.map((env) => (
                  <button
                    key={env.id}
                    onClick={() => setSelectedEnvId(env.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedEnvId === env.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {env.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedEnv ? (
                <>
                  <div className="p-4 border-b flex justify-between items-center bg-card">
                    <Input
                      value={selectedEnv.name}
                      onChange={(e) =>
                        updateSelectedEnv({ name: e.target.value })
                      }
                      className="max-w-sm font-semibold h-9"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteEnvironment(selectedEnv.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 w-8"></th>
                          <th className="pb-2 font-medium">Variable</th>
                          <th className="pb-2 font-medium">Initial Value</th>
                          <th className="pb-2 font-medium">Current Value</th>
                          <th className="pb-2 w-20">Secret</th>
                          <th className="pb-2 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="space-y-1">
                        {selectedEnv.variables.map((v) => (
                          <tr
                            key={v.id}
                            className="group border-b last:border-0"
                          >
                            <td className="py-1">
                              <input
                                type="checkbox"
                                checked={v.enabled}
                                onChange={(e) =>
                                  updateVariable(v.id, {
                                    enabled: e.target.checked,
                                  })
                                }
                                className="mr-2"
                              />
                            </td>
                            <td className="py-1 pr-2">
                              <Input
                                value={v.key}
                                onChange={(e) =>
                                  updateVariable(v.id, { key: e.target.value })
                                }
                                placeholder="VARIABLE_NAME"
                                className="font-mono text-xs h-8"
                              />
                            </td>
                            <td className="py-1 pr-2">
                              <Input
                                value={v.initialValue}
                                onChange={(e) =>
                                  updateVariable(v.id, {
                                    initialValue: e.target.value,
                                  })
                                }
                                type={v.isSecret ? "password" : "text"}
                                className="font-mono text-xs h-8"
                              />
                            </td>
                            <td className="py-1 pr-2">
                              <Input
                                value={v.currentValue}
                                onChange={(e) =>
                                  updateVariable(v.id, {
                                    currentValue: e.target.value,
                                  })
                                }
                                type={v.isSecret ? "password" : "text"}
                                className="font-mono text-xs h-8"
                              />
                            </td>
                            <td className="py-1 text-center">
                              <button
                                onClick={() =>
                                  updateVariable(v.id, {
                                    isSecret: !v.isSecret,
                                  })
                                }
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {v.isSecret ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                            <td className="py-1 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                                onClick={() => removeVariable(v.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 text-xs"
                      onClick={addVariable}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Variable
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select or create an environment
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
