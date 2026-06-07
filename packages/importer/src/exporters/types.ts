import { ImportedCollection, ImportedFolder, ImportedRequest } from "../types";

export interface ExportResult {
  filename: string;
  content: string;
  mimeType: string;
}

export interface Exporter {
  id: string;
  name: string;
  fileExtension: string;

  exportCollection(collection: ImportedCollection): ExportResult;
  exportFolder(
    folder: ImportedFolder,
    subfolders: ImportedFolder[],
    requests: (ImportedRequest & { folderId?: string | null })[]
  ): ExportResult;
  exportRequest(request: ImportedRequest): ExportResult;
}
