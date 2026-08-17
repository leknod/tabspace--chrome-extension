import { useRef, useState } from 'react';
import { signOut } from '@/lib/auth';
import { setLocalBookmarks, setLocalSpaces } from '@/lib/storage';
import { DEFAULT_SPACE_ID } from '@/lib/types';
import type { Bookmark, BookmarksFile, Space } from '@/lib/types';
import { useBookmarks } from '@/lib/useBookmarks';

export default function Options() {
  const { bookmarks, spaces, loading, status, error, lastSyncedAt, sync, reload } = useBookmarks();
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const data: BookmarksFile = { version: 2, spaces, bookmarks };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tabspace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text) as BookmarksFile;
    const now = Date.now();
    const importedSpaces: Space[] = (parsed.spaces ?? []).map((s) => ({ ...s, updatedAt: s.updatedAt ?? now }));
    const imported: Bookmark[] = (parsed.bookmarks ?? []).map((b) => ({
      ...b,
      spaceId: b.spaceId ?? DEFAULT_SPACE_ID,
      updatedAt: b.updatedAt ?? now,
    }));

    await setLocalSpaces(importedSpaces);
    await setLocalBookmarks(imported);
    await reload();
    await sync();
    setMessage(`Imported ${imported.length} bookmarks in ${importedSpaces.length} spaces.`);
  }

  async function handleSignOut() {
    await signOut();
    setMessage('Signed out. The next sync will ask you to sign in again.');
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-xl font-semibold text-white">TabSpace — Options</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Your bookmarks are stored in a private folder in your Google Drive (appDataFolder), invisible
        to you outside this extension.
      </p>

      <section className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold text-neutral-100">Sync</h2>
        <p className="mt-1 text-xs text-neutral-400">
          {status === 'syncing'
            ? 'Syncing…'
            : lastSyncedAt
              ? `Last synced: ${new Date(lastSyncedAt).toLocaleString()}`
              : 'Not synced yet in this session.'}
        </p>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => sync()}
            disabled={status === 'syncing'}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200 disabled:opacity-50"
          >
            {status === 'syncing' ? 'Syncing…' : 'Sync now'}
          </button>
          <button
            onClick={handleSignOut}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-800"
          >
            Sign out of Google
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold text-neutral-100">Backup</h2>
        <p className="mt-1 text-xs text-neutral-400">
          {loading ? 'Loading…' : `${bookmarks.length} bookmarks saved.`}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleExport}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-800"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-800"
          >
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      {message && <p className="mt-4 text-sm text-neutral-200">{message}</p>}
    </main>
  );
}
