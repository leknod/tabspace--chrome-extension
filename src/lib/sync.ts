import { findFileId, readBookmarksFile, writeBookmarksFile } from './drive';
import { getLocalBookmarks, getSyncState, setLocalBookmarks, setSyncState } from './storage';
import type { Bookmark } from './types';

/**
 * Fusiona local y remoto por id, quedandose con el updatedAt mas reciente.
 * Los marcados como `deleted` se conservan en la fusion pero se filtran al leer,
 * asi el borrado se propaga entre dispositivos en vez de "resucitar".
 */
function mergeBookmarks(local: Bookmark[], remote: Bookmark[]): Bookmark[] {
  const byId = new Map<string, Bookmark>();

  for (const b of remote) byId.set(b.id, b);
  for (const b of local) {
    const existing = byId.get(b.id);
    if (!existing || b.updatedAt >= existing.updatedAt) byId.set(b.id, b);
  }

  return [...byId.values()];
}

export interface SyncResult {
  bookmarks: Bookmark[];
  syncedAt: number;
}

/** Sube y baja cambios: fusiona local+remoto, escribe el resultado en Drive y en cache local. */
export async function syncBookmarks(): Promise<SyncResult> {
  const [local, syncState] = await Promise.all([getLocalBookmarks(), getSyncState()]);

  const fileId = syncState.driveFileId ?? (await findFileId());
  const remoteFile = fileId ? await readBookmarksFile(fileId) : { version: 1 as const, bookmarks: [] };

  const merged = mergeBookmarks(local, remoteFile.bookmarks);
  const finalFileId = await writeBookmarksFile({ version: 1, bookmarks: merged }, fileId);

  const syncedAt = Date.now();
  await Promise.all([
    setLocalBookmarks(merged),
    setSyncState({ lastSyncedAt: syncedAt, driveFileId: finalFileId }),
  ]);

  return { bookmarks: merged.filter((b) => !b.deleted), syncedAt };
}
