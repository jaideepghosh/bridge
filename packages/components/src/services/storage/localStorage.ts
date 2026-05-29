import { Collection, Folder, SavedRequest, ApiExample, Environment } from "../../types";
import { StorageProvider } from "./types";

const STORAGE_KEYS = {
  COLLECTIONS: "api_workbench_collections",
  FOLDERS: "api_workbench_folders",
  REQUESTS: "api_workbench_requests",
  EXAMPLES: "api_workbench_examples",
  ENVIRONMENTS: "api_workbench_environments",
  ACTIVE_ENV: "api_workbench_active_env",
};

export class LocalStorageProvider implements StorageProvider {
  async initialize(): Promise<void> {
    // localStorage is synchronous — nothing to load asynchronously
  }

  private getItems<T>(key: string): T[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveItems<T>(key: string, items: T[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(items));
  }

  getCollections(): Collection[] { return this.getItems<Collection>(STORAGE_KEYS.COLLECTIONS); }
  saveCollection(collection: Collection) {
    const items = this.getCollections();
    const index = items.findIndex(i => i.id === collection.id);
    if (index >= 0) items[index] = collection; else items.push(collection);
    this.saveItems(STORAGE_KEYS.COLLECTIONS, items);
  }
  deleteCollection(id: string) {
    this.saveItems(STORAGE_KEYS.COLLECTIONS, this.getCollections().filter(i => i.id !== id));
  }

  getFolders(): Folder[] { return this.getItems<Folder>(STORAGE_KEYS.FOLDERS); }
  saveFolder(folder: Folder) {
    const items = this.getFolders();
    const index = items.findIndex(i => i.id === folder.id);
    if (index >= 0) items[index] = folder; else items.push(folder);
    this.saveItems(STORAGE_KEYS.FOLDERS, items);
  }
  deleteFolder(id: string) {
    this.saveItems(STORAGE_KEYS.FOLDERS, this.getFolders().filter(i => i.id !== id));
  }

  getRequests(): SavedRequest[] { return this.getItems<SavedRequest>(STORAGE_KEYS.REQUESTS); }
  saveRequest(request: SavedRequest) {
    const items = this.getRequests();
    const index = items.findIndex(i => i.id === request.id);
    if (index >= 0) items[index] = request; else items.push(request);
    this.saveItems(STORAGE_KEYS.REQUESTS, items);
  }
  deleteRequest(id: string) {
    this.saveItems(STORAGE_KEYS.REQUESTS, this.getRequests().filter(i => i.id !== id));
  }

  getExamples(): ApiExample[] { return this.getItems<ApiExample>(STORAGE_KEYS.EXAMPLES); }
  saveExample(example: ApiExample) {
    const items = this.getExamples();
    const index = items.findIndex(i => i.id === example.id);
    if (index >= 0) items[index] = example; else items.push(example);
    this.saveItems(STORAGE_KEYS.EXAMPLES, items);
  }
  deleteExample(id: string) {
    this.saveItems(STORAGE_KEYS.EXAMPLES, this.getExamples().filter(i => i.id !== id));
  }

  getEnvironments(): Environment[] { return this.getItems<Environment>(STORAGE_KEYS.ENVIRONMENTS); }
  saveEnvironment(env: Environment) {
    const items = this.getEnvironments();
    const index = items.findIndex(i => i.id === env.id);
    if (index >= 0) items[index] = env; else items.push(env);
    this.saveItems(STORAGE_KEYS.ENVIRONMENTS, items);
  }
  deleteEnvironment(id: string) {
    this.saveItems(STORAGE_KEYS.ENVIRONMENTS, this.getEnvironments().filter(i => i.id !== id));
  }

  getActiveEnvironmentId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ENV) || null;
  }
  setActiveEnvironmentId(id: string | null) {
    if (typeof window === "undefined") return;
    if (id) localStorage.setItem(STORAGE_KEYS.ACTIVE_ENV, id);
    else localStorage.removeItem(STORAGE_KEYS.ACTIVE_ENV);
  }
}
