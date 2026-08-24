export type ObsidianVaultFileHandle = {
  createWritable: () => Promise<{
    write: (value: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

export type ObsidianVaultDirectoryHandle = {
  name: string;
  getDirectoryHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<ObsidianVaultDirectoryHandle>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<ObsidianVaultFileHandle>;
  queryPermission?: (options?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (options?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
};

const DATABASE_NAME = "xe1signal-tools";
const STORE_NAME = "handles";
const HANDLE_KEY = "obsidian-vault";

function openVaultDatabase() {
  if (typeof indexedDB === "undefined") return Promise.resolve<IDBDatabase | null>(null);

  return new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Obsidian vault storage is unavailable"));
  });
}

export async function saveObsidianVaultHandle(handle: ObsidianVaultDirectoryHandle) {
  const database = await openVaultDatabase().catch(() => null);
  if (!database) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
      transaction.oncomplete = () => {
        database.close();
        resolve(true);
      };
      transaction.onerror = () => {
        database.close();
        resolve(false);
      };
      transaction.onabort = () => {
        database.close();
        resolve(false);
      };
    } catch {
      database.close();
      resolve(false);
    }
  });
}

export async function loadObsidianVaultHandle() {
  const database = await openVaultDatabase().catch(() => null);
  if (!database) return null;

  return new Promise<ObsidianVaultDirectoryHandle | null>((resolve) => {
    try {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(HANDLE_KEY);
      request.onsuccess = () => {
        database.close();
        resolve((request.result as ObsidianVaultDirectoryHandle | undefined) || null);
      };
      request.onerror = () => {
        database.close();
        resolve(null);
      };
    } catch {
      database.close();
      resolve(null);
    }
  });
}

export async function clearObsidianVaultHandle() {
  const database = await openVaultDatabase().catch(() => null);
  if (!database) return;

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(HANDLE_KEY);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
    transaction.onabort = () => database.close();
  } catch {
    database.close();
  }
}
