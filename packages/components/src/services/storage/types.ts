import {
  Collection,
  Folder,
  SavedRequest,
  ApiExample,
  Environment,
} from "../../types";

export interface StorageProvider {
  isNative?: boolean;
  /** Async initialization — load data from persistent storage into memory. No-op for synchronous stores. */
  initialize(): Promise<void>;

  getDefaultDirectory?(): Promise<string>;

  requiresPermissionGesture?: boolean;
  requestPermissionGesture?(): Promise<boolean>;

  getCollections(): Collection[];
  saveCollection(collection: Collection): void;
  deleteCollection(id: string): void;

  getFolders(): Folder[];
  saveFolder(folder: Folder): void;
  deleteFolder(id: string): void;

  getRequests(): SavedRequest[];
  saveRequest(request: SavedRequest): void;
  deleteRequest(id: string): void;

  getExamples(): ApiExample[];
  saveExample(example: ApiExample): void;
  deleteExample(id: string): void;

  getEnvironments(): Environment[];
  saveEnvironment(env: Environment): void;
  deleteEnvironment(id: string): void;

  getActiveEnvironmentId(): string | null;
  setActiveEnvironmentId(id: string | null): void;
}
