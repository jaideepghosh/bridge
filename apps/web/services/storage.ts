import { v4 as uuidv4 } from "uuid";
import { Collection, Folder, SavedRequest, ApiExample, Environment } from "@/types";

const STORAGE_KEYS = {
  COLLECTIONS: "api_workbench_collections",
  FOLDERS: "api_workbench_folders",
  REQUESTS: "api_workbench_requests",
  EXAMPLES: "api_workbench_examples",
  ENVIRONMENTS: "api_workbench_environments",
  ACTIVE_ENV: "api_workbench_active_env",
};

export class LocalStorageProvider {
  constructor() {
    // this.initSeedData();
  }

  private initSeedData() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEYS.COLLECTIONS)) {
      const collectionId = uuidv4();
      const folder1Id = uuidv4();
      const folder2Id = uuidv4();
      
      const collections: Collection[] = [{
        id: collectionId,
        name: "Demo APIs",
        description: "Sample API collection",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }];

      const folders: Folder[] = [
        { id: folder1Id, name: "JSONPlaceholder", collectionId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: folder2Id, name: "HTTPBin", collectionId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];

      const requests: SavedRequest[] = [
        {
          id: uuidv4(),
          name: "Get Posts",
          method: "GET",
          url: "https://jsonplaceholder.typicode.com/posts",
          headers: [],
          queryParams: [],
          body: { type: "none" },
          auth: { type: "none" },
          folderId: folder1Id,
          collectionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: "Get Post by ID",
          method: "GET",
          url: "https://jsonplaceholder.typicode.com/posts/1",
          headers: [],
          queryParams: [],
          body: { type: "none" },
          auth: { type: "none" },
          folderId: folder1Id,
          collectionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: "Create Post",
          method: "POST",
          url: "https://jsonplaceholder.typicode.com/posts",
          headers: [{ id: uuidv4(), key: "Content-Type", value: "application/json", enabled: true }],
          queryParams: [],
          body: { type: "json", content: JSON.stringify({ title: "foo", body: "bar", userId: 1 }, null, 2) },
          auth: { type: "none" },
          folderId: folder1Id,
          collectionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: "Get HTTPBin",
          method: "GET",
          url: "https://httpbin.org/get",
          headers: [],
          queryParams: [],
          body: { type: "none" },
          auth: { type: "none" },
          folderId: folder2Id,
          collectionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: "Post HTTPBin",
          method: "POST",
          url: "https://httpbin.org/post",
          headers: [],
          queryParams: [],
          body: { type: "json", content: "{ \"test\": 123 }" },
          auth: { type: "none" },
          folderId: folder2Id,
          collectionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: "Get Headers",
          method: "GET",
          url: "https://httpbin.org/headers",
          headers: [],
          queryParams: [],
          body: { type: "none" },
          auth: { type: "none" },
          folderId: folder2Id,
          collectionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const environments: Environment[] = [
        {
          id: uuidv4(),
          name: "Local Development",
          variables: [
            { id: uuidv4(), key: "BASE_URL", initialValue: "http://localhost:3000", currentValue: "http://localhost:3000", enabled: true, isSecret: false },
            { id: uuidv4(), key: "API_VERSION", initialValue: "v1", currentValue: "v1", enabled: true, isSecret: false },
            { id: uuidv4(), key: "ACCESS_TOKEN", initialValue: "dev_token_123", currentValue: "dev_token_123", enabled: true, isSecret: true }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: "Production",
          variables: [
            { id: uuidv4(), key: "BASE_URL", initialValue: "https://api.example.com", currentValue: "https://api.example.com", enabled: true, isSecret: false },
            { id: uuidv4(), key: "API_VERSION", initialValue: "v1", currentValue: "v1", enabled: true, isSecret: false },
            { id: uuidv4(), key: "ACCESS_TOKEN", initialValue: "prod_token_456", currentValue: "prod_token_456", enabled: true, isSecret: true }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
      localStorage.setItem(STORAGE_KEYS.ENVIRONMENTS, JSON.stringify(environments));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ENV, environments[0].id);
      localStorage.setItem(STORAGE_KEYS.EXAMPLES, JSON.stringify([]));
    }
  }

  private getItems<T>(key: string): T[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveItems<T>(key: string, items: T[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(items));
  }

  // Collections
  getCollections(): Collection[] { return this.getItems<Collection>(STORAGE_KEYS.COLLECTIONS); }
  saveCollection(collection: Collection) {
    const items = this.getCollections();
    const index = items.findIndex(i => i.id === collection.id);
    if (index >= 0) items[index] = collection; else items.push(collection);
    this.saveItems(STORAGE_KEYS.COLLECTIONS, items);
  }
  deleteCollection(id: string) {
    this.saveItems(STORAGE_KEYS.COLLECTIONS, this.getCollections().filter(i => i.id !== id));
    // Cascade delete folders, requests? Skipping for simplicity here, but good practice.
  }

  // Folders
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

  // Requests
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

  // Examples
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

  // Environments
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
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ENV) || null;
  }
  setActiveEnvironmentId(id: string | null) {
    if (typeof window === 'undefined') return;
    if (id) localStorage.setItem(STORAGE_KEYS.ACTIVE_ENV, id);
    else localStorage.removeItem(STORAGE_KEYS.ACTIVE_ENV);
  }
}

export const storage = new LocalStorageProvider();