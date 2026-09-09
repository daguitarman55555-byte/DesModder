const DATABASE = "desmodder-vector-game-runtime";
const STORE = "states";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open save storage."));
  });
}

export async function saveState(slot: string, state: Uint8Array) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(state, slot);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the game."));
  });
  database.close();
}

export async function loadState(slot: string) {
  const database = await openDatabase();
  const state = await new Promise<Uint8Array | undefined>((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(slot);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not load the save."));
  });
  database.close();
  return state;
}
