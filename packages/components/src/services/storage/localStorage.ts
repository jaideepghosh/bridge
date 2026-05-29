import { Collection, Folder, SavedRequest, ApiExample, Environment } from "../../types";
import { StorageProvider } from "./types";

export class LocalStorageProvider implements StorageProvider {
  async initialize(): Promise<void> {
    // localStorage is synchronous — nothing to load asynchronously
  }

  async getDefaultDirectory(): Promise<string> {
    return "default-workspace";
  }

  private getPrefix(): string {
    if (typeof window === "undefined") return "api_workbench_";
    const customDir = localStorage.getItem("bridge_storage_directory");
    return customDir ? `bridge_storage_[${customDir}]_` : "api_workbench_";
  }

  private getKey(name: string): string {
    return `${this.getPrefix()}${name}`;
  }

  private getItems<T>(keyName: string): T[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(this.getKey(keyName));
    return data ? JSON.parse(data) : [];
  }

  private saveItems<T>(keyName: string, items: T[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.getKey(keyName), JSON.stringify(items));
  }

  // Collections
  getCollections(): Collection[] { return this.getItems<Collection>("collections"); }
  saveCollection(collection: Collection) {
    const items = this.getCollections();
    const index = items.findIndex(i => i.id === collection.id);
    if (index >= 0) items[index] = collection; else items.push(collection);
    this.saveItems("collections", items);
  }
  deleteCollection(id: string) {
    this.saveItems("collections", this.getCollections().filter(i => i.id !== id));
  }

  // Folders
  getFolders(): Folder[] { return this.getItems<Folder>("folders"); }
  saveFolder(folder: Folder) {
    const items = this.getFolders();
    const index = items.findIndex(i => i.id === folder.id);
    if (index >= 0) items[index] = folder; else items.push(folder);
    this.saveItems("folders", items);
  }
  deleteFolder(id: string) {
    this.saveItems("folders", this.getFolders().filter(i => i.id !== id));
  }

  // Requests
  getRequests(): SavedRequest[] { return this.getItems<SavedRequest>("requests"); }
  saveRequest(request: SavedRequest) {
    const items = this.getRequests();
    const index = items.findIndex(i => i.id === request.id);
    if (index >= 0) items[index] = request; else items.push(request);
    this.saveItems("requests", items);
  }
  deleteRequest(id: string) {
    this.saveItems("requests", this.getRequests().filter(i => i.id !== id));
  }

  // Examples
  getExamples(): ApiExample[] { return this.getItems<ApiExample>("examples"); }
  saveExample(example: ApiExample) {
    const items = this.getExamples();
    const index = items.findIndex(i => i.id === example.id);
    if (index >= 0) items[index] = example; else items.push(example);
    this.saveItems("examples", items);
  }
  deleteExample(id: string) {
    this.saveItems("examples", this.getExamples().filter(i => i.id !== id));
  }

  // Environments
  getEnvironments(): Environment[] { return this.getItems<Environment>("environments"); }
  saveEnvironment(env: Environment) {
    const items = this.getEnvironments();
    const index = items.findIndex(i => i.id === env.id);
    if (index >= 0) items[index] = env; else items.push(env);
    this.saveItems("environments", items);
  }
  deleteEnvironment(id: string) {
    this.saveItems("environments", this.getEnvironments().filter(i => i.id !== id));
  }

  getActiveEnvironmentId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.getKey("active_env")) || null;
  }
  setActiveEnvironmentId(id: string | null) {
    if (typeof window === "undefined") return;
    if (id) localStorage.setItem(this.getKey("active_env"), id);
    else localStorage.removeItem(this.getKey("active_env"));
  }
}
