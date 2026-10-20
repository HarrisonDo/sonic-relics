import { DEFAULT_PREFERENCES } from "./model";
import type { Preferences, Track } from "./model";

const PREFIX = "sonic-relics:";

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readPreferences(): Preferences {
  const saved = readLocal<Partial<Preferences> | null>("preferences", null);
  const systemReduced =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!saved || typeof saved !== "object")
    return { ...DEFAULT_PREFERENCES, reducedMotion: systemReduced };
  return {
    volume:
      typeof saved.volume === "number" && Number.isFinite(saved.volume)
        ? Math.min(1, Math.max(0, saved.volume))
        : DEFAULT_PREFERENCES.volume,
    muted: saved.muted === true,
    reducedMotion:
      typeof saved.reducedMotion === "boolean"
        ? saved.reducedMotion
        : systemReduced,
    soundEffects: saved.soundEffects === true,
    digitalDefault: saved.digitalDefault === "mp4" ? "mp4" : "ipod",
    repeat:
      saved.repeat === "off" || saved.repeat === "one" ? saved.repeat : "all",
    shuffle: saved.shuffle === true,
  };
}

export interface SavedTrack extends Omit<Track, "src" | "cover"> {
  audio: Blob;
  artwork?: Blob;
  fallbackCover: string;
}

let database: Promise<IDBDatabase> | undefined;
function openDatabase(): Promise<IDBDatabase> {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open("sonic-relics-library", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("tracks", { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        database = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        database = undefined;
        reject(new Error("音乐库正在其他页面更新"));
      };
    });
  return database;
}

export async function readSavedTracks(): Promise<SavedTrack[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("tracks", "readonly")
      .objectStore("tracks")
      .getAll();
    request.onsuccess = () =>
      resolve(
        (request.result as SavedTrack[]).sort(
          (a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0),
        ),
      );
    request.onerror = () => reject(request.error);
  });
}

export async function saveTrack(track: SavedTrack): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("tracks", "readwrite");
    transaction.objectStore("tracks").put(track);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("音乐库保存被中断"));
  });
}

export async function deleteSavedTrack(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("tracks", "readwrite");
    transaction.objectStore("tracks").delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("音乐库更新被中断"));
  });
}

export function hydrateTrack(saved: SavedTrack): Track {
  const { audio, artwork, fallbackCover, ...track } = saved;
  return {
    ...track,
    src: URL.createObjectURL(audio),
    cover: artwork ? URL.createObjectURL(artwork) : fallbackCover,
  };
}

export function releaseTrack(track: Track): void {
  if (track.src.startsWith("blob:")) URL.revokeObjectURL(track.src);
  if (track.cover.startsWith("blob:")) URL.revokeObjectURL(track.cover);
}
