import {
  Collection,
  Folder,
  SavedRequest,
  ApiExample,
  Environment,
} from "../../types";
import { StorageProvider } from "./types";

interface StorageData {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  examples: ApiExample[];
  environments: Environment[];
  activeEnvironmentId: string | null;
}

const EMPTY_DATA: StorageData = {
  collections: [],
  folders: [],
  requests: [],
  examples: [],
  environments: [],
  activeEnvironmentId: null,
};

export class ApiStorageProvider implements StorageProvider {
  private data: StorageData = { ...EMPTY_DATA };
  private readonly baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3001") {
    this.baseUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage`, {
        method: "GET",
      });
      if (response.ok) {
        const json = await response.json();
        this.data = { ...EMPTY_DATA, ...json };
      } else {
        console.warn(
          `[ApiStorageProvider] Failed to load data from API: ${response.statusText}. Using empty memory store.`,
        );
        this.data = { ...EMPTY_DATA };
      }
    } catch (err) {
      console.error(
        "[ApiStorageProvider] Failed to connect to storage API. Using empty memory store.",
        err,
      );
      this.data = { ...EMPTY_DATA };
    }
  }

  private async flush(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.data),
      });
      if (!response.ok) {
        console.error(
          `[ApiStorageProvider] Flush failed: ${response.statusText}`,
        );
      }
    } catch (err) {
      console.error("[ApiStorageProvider] Flush connection failed:", err);
    }
  }

  // Collections
  getCollections(): Collection[] {
    return this.data.collections;
  }
  saveCollection(collection: Collection): void {
    const idx = this.data.collections.findIndex((i) => i.id === collection.id);
    if (idx >= 0) this.data.collections[idx] = collection;
    else this.data.collections.push(collection);
    this.flush();
  }
  deleteCollection(id: string): void {
    this.data.collections = this.data.collections.filter((i) => i.id !== id);
    this.flush();
  }

  // Folders
  getFolders(): Folder[] {
    return this.data.folders;
  }
  saveFolder(folder: Folder): void {
    const idx = this.data.folders.findIndex((i) => i.id === folder.id);
    if (idx >= 0) this.data.folders[idx] = folder;
    else this.data.folders.push(folder);
    this.flush();
  }
  deleteFolder(id: string): void {
    this.data.folders = this.data.folders.filter((i) => i.id !== id);
    this.flush();
  }

  // Requests
  getRequests(): SavedRequest[] {
    return this.data.requests;
  }
  saveRequest(request: SavedRequest): void {
    const idx = this.data.requests.findIndex((i) => i.id === request.id);
    if (idx >= 0) this.data.requests[idx] = request;
    else this.data.requests.push(request);
    this.flush();
  }
  deleteRequest(id: string): void {
    this.data.requests = this.data.requests.filter((i) => i.id !== id);
    this.flush();
  }

  // Examples
  getExamples(): ApiExample[] {
    return this.data.examples;
  }
  saveExample(example: ApiExample): void {
    const idx = this.data.examples.findIndex((i) => i.id === example.id);
    if (idx >= 0) this.data.examples[idx] = example;
    else this.data.examples.push(example);
    this.flush();
  }
  deleteExample(id: string): void {
    this.data.examples = this.data.examples.filter((i) => i.id !== id);
    this.flush();
  }

  // Environments
  getEnvironments(): Environment[] {
    return this.data.environments;
  }
  saveEnvironment(env: Environment): void {
    const idx = this.data.environments.findIndex((i) => i.id === env.id);
    if (idx >= 0) this.data.environments[idx] = env;
    else this.data.environments.push(env);
    this.flush();
  }
  deleteEnvironment(id: string): void {
    this.data.environments = this.data.environments.filter((i) => i.id !== id);
    this.flush();
  }

  // Active environment
  getActiveEnvironmentId(): string | null {
    return this.data.activeEnvironmentId;
  }
  setActiveEnvironmentId(id: string | null): void {
    this.data.activeEnvironmentId = id;
    this.flush();
  }
}
