export const WAD_DATABASE = "desmodder-doom";
const STORE = "iwads";
const ACTIVE_KEY = "active";

export interface WadInfo {
  name: string;
  size: number;
  kind: "IWAD" | "PWAD";
  game: "doom-shareware" | "doom" | "doom2" | "unknown";
}

function readAscii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

export function inspectWad(buffer: ArrayBuffer, name = "game.wad"): WadInfo {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength < 12) throw new Error("This file is too small to be a WAD.");
  const kind = readAscii(bytes, 0, 4);
  if (kind !== "IWAD" && kind !== "PWAD")
    throw new Error("Choose a valid Doom WAD file.");
  const view = new DataView(buffer);
  const lumpCount = view.getInt32(4, true);
  const directoryOffset = view.getInt32(8, true);
  if (lumpCount <= 0 || lumpCount > 200000)
    throw new Error("The WAD directory is invalid.");
  if (directoryOffset < 12 || directoryOffset + lumpCount * 16 > bytes.byteLength)
    throw new Error("The WAD directory lies outside the file.");
  const names = new Set<string>();
  for (let i = 0; i < lumpCount; i++)
    names.add(readAscii(bytes, directoryOffset + i * 16 + 8, 8).replace(/\0+$/, ""));
  const game = names.has("MAP01")
    ? "doom2"
    : names.has("E2M1")
      ? "doom"
      : names.has("E1M1")
        ? "doom-shareware"
        : "unknown";
  if (game === "unknown") throw new Error("This WAD has no recognized Doom maps.");
  return { name, size: bytes.byteLength, kind, game };
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(WAD_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open WAD storage."));
  });
}

export async function saveWad(file: File) {
  const buffer = await file.arrayBuffer();
  const info = inspectWad(buffer, file.name);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put({ buffer, info }, ACTIVE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the WAD."));
  });
  database.close();
  return info;
}

export async function loadWad(): Promise<{ buffer: ArrayBuffer; info: WadInfo } | undefined> {
  const database = await openDatabase();
  const value = await new Promise<{ buffer: ArrayBuffer; info: WadInfo } | undefined>((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(ACTIVE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not load the WAD."));
  });
  database.close();
  return value;
}
