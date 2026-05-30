import { Collection, Folder, SavedRequest, ApiExample, Environment } from "../../types";
import { StorageProvider } from "./types";
import { loadDirectoryHandle } from "./indexedDb";

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

export class BrowserFileSystemStorageProvider implements StorageProvider {
  isNative = false;
  private data: StorageData = { ...EMPTY };
  private handle: FileSystemDirectoryHandle | null = null;
  private hasPermission = false;

  async getDefaultDirectory(): Promise<string> {
    return "bridge-workspace";
  }

  get requiresPermissionGesture(): boolean {
    return this.handle !== null && !this.hasPermission;
  }

  async requestPermissionGesture(): Promise<boolean> {
    return this.requestPermission();
  }

  /**
   * Checks if permission is currently granted for the handle.
   */
  async checkPermissionStatus(): Promise<boolean> {
    if (!this.handle) return false;
    try {
      const status = await (this.handle as any).queryPermission({ mode: "readwrite" });
      this.hasPermission = status === "granted";
      return this.hasPermission;
    } catch {
      return false;
    }
  }

  /**
   * Prompts the browser's native user-gesture permission prompt.
   * This MUST be called inside a click or user-triggered event.
   */
  async requestPermission(): Promise<boolean> {
    if (!this.handle) return false;
    try {
      const status = await (this.handle as any).requestPermission({ mode: "readwrite" });
      this.hasPermission = status === "granted";
      if (this.hasPermission) {
        await this.loadData();
      }
      return this.hasPermission;
    } catch (err) {
      console.error("[BrowserFileSystemStorageProvider] Permission request failed:", err);
      return false;
    }
  }

  async initialize(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      const handle = await loadDirectoryHandle();
      if (!handle) {
        console.info("[BrowserFileSystemStorageProvider] No directory handle stored in IndexedDB.");
        return;
      }

      this.handle = handle;
      
      const status = await (handle as any).queryPermission({ mode: "readwrite" });
      if (status === "granted") {
        this.hasPermission = true;
        await this.loadData();
      } else {
        console.info("[BrowserFileSystemStorageProvider] Directory handle exists but requires user authorization.");
      }
    } catch (err) {
      console.error("[BrowserFileSystemStorageProvider] Initialization failed:", err);
    }
  }

  private async loadData(): Promise<void> {
    if (!this.handle) return;
    try {
      let fileHandle: FileSystemFileHandle;
      try {
        fileHandle = await this.handle.getFileHandle("bridge-data.json", { create: false });
      } catch {
        // File does not exist yet — we will start with empty data
        this.data = { ...EMPTY };
        return;
      }

      const file = await fileHandle.getFile();
      const text = await file.text();
      try {
        this.data = { ...EMPTY, ...JSON.parse(text) };
      } catch {
        this.data = { ...EMPTY };
      }
    } catch (err) {
      console.error("[BrowserFileSystemStorageProvider] Failed to load data file:", err);
      this.data = { ...EMPTY };
    }
  }

  private async flush(): Promise<void> {
    if (!this.handle || !this.hasPermission) return;
    try {
      const fileHandle = await this.handle.getFileHandle("bridge-data.json", { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(this.data, null, 2));
      await writable.close();
    } catch (err) {
      console.error("[BrowserFileSystemStorageProvider] Flush failed:", err);
    }
  }

  // Collections
  getCollections(): Collection[] {
    return [...this.data.collections];
  }
  saveCollection(collection: Collection): void {
    const items = [...this.data.collections];
    const index = items.findIndex(i => i.id === collection.id);
    if (index >= 0) items[index] = collection; else items.push(collection);
    this.data.collections = items;
    this.flush();
  }
  deleteCollection(id: string): void {
    this.data.collections = this.data.collections.filter(i => i.id !== id);
    this.flush();
  }

  // Folders
  getFolders(): Folder[] {
    return [...this.data.folders];
  }
  saveFolder(folder: Folder): void {
    const items = [...this.data.folders];
    const index = items.findIndex(i => i.id === folder.id);
    if (index >= 0) items[index] = folder; else items.push(folder);
    this.data.folders = items;
    this.flush();
  }
  deleteFolder(id: string): void {
    this.data.folders = this.data.folders.filter(i => i.id !== id);
    this.flush();
  }

  // Requests
  getRequests(): SavedRequest[] {
    return [...this.data.requests];
  }
  saveRequest(request: SavedRequest): void {
    const items = [...this.data.requests];
    const index = items.findIndex(i => i.id === request.id);
    if (index >= 0) items[index] = request; else items.push(request);
    this.data.requests = items;
    this.flush();
  }
  deleteRequest(id: string): void {
    this.data.requests = this.data.requests.filter(i => i.id !== id);
    this.flush();
  }

  // Examples
  getExamples(): ApiExample[] {
    return [...this.data.examples];
  }
  saveExample(example: ApiExample): void {
    const items = [...this.data.examples];
    const index = items.findIndex(i => i.id === example.id);
    if (index >= 0) items[index] = example; else items.push(example);
    this.data.examples = items;
    this.flush();
  }
  deleteExample(id: string): void {
    this.data.examples = this.data.examples.filter(i => i.id !== id);
    this.flush();
  }

  // Environments
  getEnvironments(): Environment[] {
    return [...this.data.environments];
  }
  saveEnvironment(env: Environment): void {
    const items = [...this.data.environments];
    const index = items.findIndex(i => i.id === env.id);
    if (index >= 0) items[index] = env; else items.push(env);
    this.data.environments = items;
    this.flush();
  }
  deleteEnvironment(id: string): void {
    this.data.environments = this.data.environments.filter(i => i.id !== id);
    this.flush();
  }

  // Active Environment
  getActiveEnvironmentId(): string | null {
    return this.data.activeEnvironmentId;
  }
  setActiveEnvironmentId(id: string | null): void {
    this.data.activeEnvironmentId = id;
    this.flush();
  }
}
