import { useCallback, useEffect, useState } from 'react';
import { getLocalBookmarks, getLocalSpaces, newId, setLastUsedSpaceId, setLocalBookmarks, setLocalSpaces } from './storage';
import { syncBookmarks } from './sync';
import { DEFAULT_SPACE_ID, DEFAULT_SPACE_NAME } from './types';
import type { Bookmark, Space } from './types';

type SyncStatus = 'idle' | 'syncing' | 'error';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const loadLocal = useCallback(async () => {
    const [localBookmarks, localSpaces] = await Promise.all([getLocalBookmarks(), getLocalSpaces()]);
    setBookmarks(localBookmarks.filter((b) => !b.deleted));
    setSpaces(
      localSpaces.filter((s) => !s.deleted).length
        ? localSpaces.filter((s) => !s.deleted)
        : [{ id: DEFAULT_SPACE_ID, name: DEFAULT_SPACE_NAME, createdAt: 0, updatedAt: 0 }],
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadLocal();
  }, [loadLocal]);

  const sync = useCallback(async () => {
    setStatus('syncing');
    setError(null);
    try {
      const result = await syncBookmarks();
      setBookmarks(result.bookmarks);
      setSpaces(result.spaces);
      setLastSyncedAt(result.syncedAt);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const addBookmark = useCallback(
    async (input: { url: string; title: string; spaceId: string }) => {
      const now = Date.now();
      const bookmark: Bookmark = {
        id: newId(),
        url: input.url,
        title: input.title || input.url,
        spaceId: input.spaceId,
        createdAt: now,
        updatedAt: now,
      };

      const current = await getLocalBookmarks();
      const next = [...current, bookmark];
      await setLocalBookmarks(next);
      setBookmarks(next.filter((b) => !b.deleted));
      await setLastUsedSpaceId(input.spaceId);
      await sync();
    },
    [sync],
  );

  const updateBookmark = useCallback(
    async (id: string, updates: { title: string; url: string; spaceId: string }) => {
      const current = await getLocalBookmarks();
      const next = current.map((b) => (b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b));
      await setLocalBookmarks(next);
      setBookmarks(next.filter((b) => !b.deleted));
      await sync();
    },
    [sync],
  );

  const deleteBookmark = useCallback(
    async (id: string) => {
      const current = await getLocalBookmarks();
      const next = current.map((b) => (b.id === id ? { ...b, deleted: true, updatedAt: Date.now() } : b));
      await setLocalBookmarks(next);
      setBookmarks(next.filter((b) => !b.deleted));
      await sync();
    },
    [sync],
  );

  const addSpace = useCallback(
    async (name: string) => {
      const now = Date.now();
      const space: Space = { id: newId(), name, createdAt: now, updatedAt: now };

      const current = await getLocalSpaces();
      const next = [...current, space];
      await setLocalSpaces(next);
      setSpaces(next.filter((s) => !s.deleted));
      await sync();
      return space;
    },
    [sync],
  );

  return {
    bookmarks,
    spaces,
    loading,
    status,
    error,
    lastSyncedAt,
    sync,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    addSpace,
    reload: loadLocal,
  };
}
