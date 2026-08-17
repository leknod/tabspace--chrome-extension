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
        order: now,
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

  /** A header is a link-less bookmark row used to group the ones below it within a space. */
  const addHeader = useCallback(
    async (spaceId: string, title: string) => {
      const now = Date.now();
      const header: Bookmark = {
        id: newId(),
        url: '',
        title,
        spaceId,
        isHeader: true,
        order: now,
        createdAt: now,
        updatedAt: now,
      };

      const current = await getLocalBookmarks();
      const next = [...current, header];
      await setLocalBookmarks(next);
      setBookmarks(next.filter((b) => !b.deleted));
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

  /** Persists a drag-and-drop reorder: `orderedIds` is the new visual order of every bookmark in one space. */
  const reorderBookmarks = useCallback(
    async (orderedIds: string[]) => {
      const now = Date.now();
      const indexById = new Map(orderedIds.map((id, index) => [id, index]));
      const current = await getLocalBookmarks();
      const next = current.map((b) => {
        const order = indexById.get(b.id);
        return order === undefined ? b : { ...b, order, updatedAt: now };
      });
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
      const space: Space = { id: newId(), name, order: now, createdAt: now, updatedAt: now };

      const current = await getLocalSpaces();
      const next = [...current, space];
      await setLocalSpaces(next);
      setSpaces(next.filter((s) => !s.deleted));
      await sync();
      return space;
    },
    [sync],
  );

  /** Persists a drag-and-drop reorder of the spaces themselves. */
  const reorderSpaces = useCallback(
    async (orderedIds: string[]) => {
      const now = Date.now();
      const indexById = new Map(orderedIds.map((id, index) => [id, index]));
      const current = await getLocalSpaces();
      const next = current.map((s) => {
        const order = indexById.get(s.id);
        return order === undefined ? s : { ...s, order, updatedAt: now };
      });
      await setLocalSpaces(next);
      setSpaces(next.filter((s) => !s.deleted));
      await sync();
    },
    [sync],
  );

  const renameSpace = useCallback(
    async (id: string, name: string) => {
      const now = Date.now();
      const current = await getLocalSpaces();
      const next = current.map((s) => (s.id === id ? { ...s, name, updatedAt: now } : s));
      await setLocalSpaces(next);
      setSpaces(next.filter((s) => !s.deleted));
      await sync();
    },
    [sync],
  );

  /** Deletes a space and moves its bookmarks to the next remaining space. No-op if it's the last space left. */
  const deleteSpace = useCallback(
    async (id: string) => {
      const now = Date.now();
      const [currentSpaces, currentBookmarks] = await Promise.all([getLocalSpaces(), getLocalBookmarks()]);
      const remaining = currentSpaces.filter((s) => !s.deleted && s.id !== id);
      const fallback = remaining.sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt))[0];
      if (!fallback) return;
      const nextSpaces = currentSpaces.map((s) => (s.id === id ? { ...s, deleted: true, updatedAt: now } : s));
      const nextBookmarks = currentBookmarks.map((b) =>
        b.spaceId === id ? { ...b, spaceId: fallback.id, updatedAt: now } : b,
      );

      await Promise.all([setLocalSpaces(nextSpaces), setLocalBookmarks(nextBookmarks)]);
      setSpaces(nextSpaces.filter((s) => !s.deleted));
      setBookmarks(nextBookmarks.filter((b) => !b.deleted));
      await sync();
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
    addHeader,
    updateBookmark,
    reorderBookmarks,
    deleteBookmark,
    addSpace,
    reorderSpaces,
    renameSpace,
    deleteSpace,
    reload: loadLocal,
  };
}
