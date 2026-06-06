import type { CodeGenerator } from "./types";

import { curlGenerator } from "./generators/curl";
import { fetchGenerator } from "./generators/fetch";
import { axiosGenerator } from "./generators/axios";
import { nodeFetchGenerator } from "./generators/node-fetch";
import { pythonRequestsGenerator } from "./generators/python-requests";
import { pythonHttpxGenerator } from "./generators/python-httpx";
import { goGenerator } from "./generators/go";
import { javaGenerator } from "./generators/java";
import { csharpGenerator } from "./generators/csharp";
import { phpGenerator } from "./generators/php";
import { rubyGenerator } from "./generators/ruby";

export class GeneratorRegistry {
  private generators = new Map<string, CodeGenerator>();

  register(generator: CodeGenerator): void {
    this.generators.set(generator.id, generator);
  }

  get(id: string): CodeGenerator | undefined {
    return this.generators.get(id);
  }

  getAll(): CodeGenerator[] {
    return Array.from(this.generators.values());
  }

  getGroupedByLanguage(): Map<string, CodeGenerator[]> {
    const grouped = new Map<string, CodeGenerator[]>();
    for (const gen of this.generators.values()) {
      const list = grouped.get(gen.language) || [];
      list.push(gen);
      grouped.set(gen.language, list);
    }
    return grouped;
  }
}

export function createDefaultRegistry(): GeneratorRegistry {
  const registry = new GeneratorRegistry();
  registry.register(curlGenerator);
  registry.register(fetchGenerator);
  registry.register(axiosGenerator);
  registry.register(nodeFetchGenerator);
  registry.register(pythonRequestsGenerator);
  registry.register(pythonHttpxGenerator);
  registry.register(goGenerator);
  registry.register(javaGenerator);
  registry.register(csharpGenerator);
  registry.register(phpGenerator);
  registry.register(rubyGenerator);
  return registry;
}
