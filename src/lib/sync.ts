import { findFileId, readBookmarksFile, writeBookmarksFile } from './drive';
import {
  getLocalBookmarks,
  getLocalSpaces,
  getSyncState,
  setLocalBookmarks,
  setLocalSpaces,
  setSyncState,
} from './storage';
import { DEFAULT_SPACE_ID, DEFAULT_SPACE_NAME } from './types';
import type { Bookmark, Space } from './types';

/**
 * Merges local and remote by id, keeping the most recent updatedAt.
 * Items marked `deleted` are kept through the merge but filtered out on read,
 * so deletions propagate across devices instead of "reviving".
 */
function mergeById<T extends { id: string; updatedAt: number }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();

  for (const item of remote) byId.set(item.id, item);
  for (const item of local) {
    const existing = byId.get(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) byId.set(item.id, item);
  }

  return [...byId.values()];
}

/** If for some reason no live space is left, recreate "General" so the app always has somewhere to save. */
function ensureDefaultSpace(spaces: Space[]): Space[] {
  const hasLiveSpace = spaces.some((s) => !s.deleted);
  if (hasLiveSpace) return spaces;

  const now = Date.now();
  return [...spaces, { id: DEFAULT_SPACE_ID, name: DEFAULT_SPACE_NAME, createdAt: now, updatedAt: now }];
}

export interface SyncResult {
  bookmarks: Bookmark[];
  spaces: Space[];
  syncedAt: number;
}

/** Uploads and downloads changes: merges local+remote, writes the result to Drive and to the local cache. */
export async function syncBookmarks(): Promise<SyncResult> {
  const [local, localSpaces, syncState] = await Promise.all([
    getLocalBookmarks(),
    getLocalSpaces(),
    getSyncState(),
  ]);

  const fileId = syncState.driveFileId ?? (await findFileId());
  const remoteFile = fileId ? await readBookmarksFile(fileId) : { version: 2 as const, spaces: [], bookmarks: [] };

  const mergedBookmarks = mergeById(local, remoteFile.bookmarks);
  const mergedSpaces = ensureDefaultSpace(mergeById(localSpaces, remoteFile.spaces));
  const finalFileId = await writeBookmarksFile(
    { version: 2, spaces: mergedSpaces, bookmarks: mergedBookmarks },
    fileId,
  );

  const syncedAt = Date.now();
  await Promise.all([
    setLocalBookmarks(mergedBookmarks),
    setLocalSpaces(mergedSpaces),
    setSyncState({ lastSyncedAt: syncedAt, driveFileId: finalFileId }),
  ]);

  return {
    bookmarks: mergedBookmarks.filter((b) => !b.deleted),
    spaces: mergedSpaces.filter((s) => !s.deleted),
    syncedAt,
  };
}
