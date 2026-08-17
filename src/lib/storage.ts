import type { Bookmark, SyncState } from './types';

const BOOKMARKS_KEY = 'bookmarks';
const SYNC_STATE_KEY = 'syncState';

export async function getLocalBookmarks(): Promise<Bookmark[]> {
  const { [BOOKMARKS_KEY]: bookmarks } = await chrome.storage.local.get(BOOKMARKS_KEY);
  return (bookmarks as Bookmark[] | undefined) ?? [];
}

export async function setLocalBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await chrome.storage.local.set({ [BOOKMARKS_KEY]: bookmarks });
}

export async function getSyncState(): Promise<SyncState> {
  const { [SYNC_STATE_KEY]: state } = await chrome.storage.local.get(SYNC_STATE_KEY);
  return (state as SyncState | undefined) ?? { lastSyncedAt: null, driveFileId: null };
}

export async function setSyncState(state: SyncState): Promise<void> {
  await chrome.storage.local.set({ [SYNC_STATE_KEY]: state });
}

export function newId(): string {
  return crypto.randomUUID();
}
