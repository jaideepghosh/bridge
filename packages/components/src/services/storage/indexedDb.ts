/**
 * Pure vanilla IndexedDB helper to store and load modern FileSystemDirectoryHandle objects.
 * Handles are stored in a database named 'bridge_db' under object store 'handles'.
 */

export function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment."));
    }

    const request = indexedDB.open("bridge_db", 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("handles", "readwrite");
      const store = tx.objectStore("handles");
      const putReq = store.put(handle, "directory_handle");

      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    request.onerror = () => reject(request.error);
  });
}

export function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return resolve(null);
    }

    const request = indexedDB.open("bridge_db", 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("handles", "readonly");
      const store = tx.objectStore("handles");
      const getReq = store.get("directory_handle");

      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    };

    request.onerror = () => resolve(null);
  });
}

export function clearDirectoryHandle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return resolve();
    }

    const request = indexedDB.open("bridge_db", 1);

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("handles", "readwrite");
      const store = tx.objectStore("handles");
      const deleteReq = store.delete("directory_handle");
      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = () => resolve();
    };

    request.onerror = () => resolve();
  });
}
