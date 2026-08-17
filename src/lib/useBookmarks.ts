import { useCallback, useEffect, useState } from 'react';
import { getLocalBookmarks, newId, setLocalBookmarks } from './storage';
import { syncBookmarks } from './sync';
import type { Bookmark } from './types';

type SyncStatus = 'idle' | 'syncing' | 'error';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const loadLocal = useCallback(async () => {
    const local = await getLocalBookmarks();
    setBookmarks(local.filter((b) => !b.deleted));
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
      setLastSyncedAt(result.syncedAt);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const addBookmark = useCallback(
    async (input: { url: string; title: string; tags?: string[] }) => {
      const now = Date.now();
      const bookmark: Bookmark = {
        id: newId(),
        url: input.url,
        title: input.title || input.url,
        tags: input.tags ?? [],
        createdAt: now,
        updatedAt: now,
      };

      const current = await getLocalBookmarks();
      const next = [...current, bookmark];
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

  return { bookmarks, loading, status, error, lastSyncedAt, sync, addBookmark, deleteBookmark, reload: loadLocal };
}
