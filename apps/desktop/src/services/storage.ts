import { appDataDir } from "@tauri-apps/api/path";
import { readTextFile, writeTextFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import {
  LocalStorageProvider,
  type StorageProvider,
  type Collection,
  type Folder,
  type SavedRequest,
  type ApiExample,
  type Environment,
} from "@payable-turborepo-starter/components";

interface StorageData {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  examples: ApiExample[];
  environments: Environment[];
  activeEnvironmentId: string | null;
}

const EMPTY: StorageData = {
  collections: [],
  folders: [],
  requests: [],
  examples: [],
  environments: [],
  activeEnvironmentId: null,
};

export class TauriStorageProvider implements StorageProvider {
  private data: StorageData = { ...EMPTY };
  private filePath: string | null = null;
  private fallback: LocalStorageProvider | null = null;

  private isTauri(): boolean {
    return typeof window !== "undefined" && (window as any).__TAURI_IPC__ !== undefined;
  }

  async initialize(): Promise<void> {
    if (!this.isTauri()) {
      console.warn("[TauriStorageProvider] Not running in Tauri environment. Falling back to LocalStorageProvider.");
      this.fallback = new LocalStorageProvider();
      await this.fallback.initialize();
      return;
    }

    try {
      const dir = await appDataDir();
      this.filePath = `${dir}/bridge-data.json`;

      const dirExists = await exists(dir);
      if (!dirExists) {
        await mkdir(dir, { recursive: true });
      }

      const fileExists = await exists(this.filePath);
      if (fileExists) {
        try {
          const raw = await readTextFile(this.filePath);
          this.data = { ...EMPTY, ...JSON.parse(raw) };
        } catch {
          this.data = { ...EMPTY };
        }
      }
    } catch (err) {
      console.error("[TauriStorageProvider] Failed to initialize Tauri storage:", err);
      console.warn("Falling back to LocalStorageProvider.");
      this.fallback = new LocalStorageProvider();
      await this.fallback.initialize();
    }
  }

  private async flush(): Promise<void> {
    if (this.fallback) return;
    if (!this.filePath) return;
    try {
      await writeTextFile(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error("[TauriStorage] flush failed:", err);
    }
  }

  // Collections
  getCollections(): Collection[] {
    if (this.fallback) return this.fallback.getCollections();
    return this.data.collections;
  }
  saveCollection(c: Collection): void {
    if (this.fallback) {
      this.fallback.saveCollection(c);
      return;
    }
    const idx = this.data.collections.findIndex(x => x.id === c.id);
    if (idx >= 0) this.data.collections[idx] = c;
    else this.data.collections.push(c);
    this.flush();
  }
  deleteCollection(id: string): void {
    if (this.fallback) {
      this.fallback.deleteCollection(id);
      return;
    }
    this.data.collections = this.data.collections.filter(x => x.id !== id);
    this.flush();
  }

  // Folders
  getFolders(): Folder[] {
    if (this.fallback) return this.fallback.getFolders();
    return this.data.folders;
  }
  saveFolder(f: Folder): void {
    if (this.fallback) {
      this.fallback.saveFolder(f);
      return;
    }
    const idx = this.data.folders.findIndex(x => x.id === f.id);
    if (idx >= 0) this.data.folders[idx] = f;
    else this.data.folders.push(f);
    this.flush();
  }
  deleteFolder(id: string): void {
    if (this.fallback) {
      this.fallback.deleteFolder(id);
      return;
    }
    this.data.folders = this.data.folders.filter(x => x.id !== id);
    this.flush();
  }

  // Requests
  getRequests(): SavedRequest[] {
    if (this.fallback) return this.fallback.getRequests();
    return this.data.requests;
  }
  saveRequest(r: SavedRequest): void {
    if (this.fallback) {
      this.fallback.saveRequest(r);
      return;
    }
    const idx = this.data.requests.findIndex(x => x.id === r.id);
    if (idx >= 0) this.data.requests[idx] = r;
    else this.data.requests.push(r);
    this.flush();
  }
  deleteRequest(id: string): void {
    if (this.fallback) {
      this.fallback.deleteRequest(id);
      return;
    }
    this.data.requests = this.data.requests.filter(x => x.id !== id);
    this.flush();
  }

  // Examples
  getExamples(): ApiExample[] {
    if (this.fallback) return this.fallback.getExamples();
    return this.data.examples;
  }
  saveExample(e: ApiExample): void {
    if (this.fallback) {
      this.fallback.saveExample(e);
      return;
    }
    const idx = this.data.examples.findIndex(x => x.id === e.id);
    if (idx >= 0) this.data.examples[idx] = e;
    else this.data.examples.push(e);
    this.flush();
  }
  deleteExample(id: string): void {
    if (this.fallback) {
      this.fallback.deleteExample(id);
      return;
    }
    this.data.examples = this.data.examples.filter(x => x.id !== id);
    this.flush();
  }

  // Environments
  getEnvironments(): Environment[] {
    if (this.fallback) return this.fallback.getEnvironments();
    return this.data.environments;
  }
  saveEnvironment(e: Environment): void {
    if (this.fallback) {
      this.fallback.saveEnvironment(e);
      return;
    }
    const idx = this.data.environments.findIndex(x => x.id === e.id);
    if (idx >= 0) this.data.environments[idx] = e;
    else this.data.environments.push(e);
    this.flush();
  }
  deleteEnvironment(id: string): void {
    if (this.fallback) {
      this.fallback.deleteEnvironment(id);
      return;
    }
    this.data.environments = this.data.environments.filter(x => x.id !== id);
    this.flush();
  }

  // Active environment
  getActiveEnvironmentId(): string | null {
    if (this.fallback) return this.fallback.getActiveEnvironmentId();
    return this.data.activeEnvironmentId;
  }
  setActiveEnvironmentId(id: string | null): void {
    if (this.fallback) {
      this.fallback.setActiveEnvironmentId(id);
      return;
    }
    this.data.activeEnvironmentId = id;
    this.flush();
  }
}
