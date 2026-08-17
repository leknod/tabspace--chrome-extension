import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { signOut } from '@/lib/auth';
import { getOpenInNewTab, setLocalBookmarks, setLocalSpaces, setOpenInNewTab } from '@/lib/storage';
import { DEFAULT_SPACE_ID } from '@/lib/types';
import type { Bookmark, BookmarksFile, Space } from '@/lib/types';
import { useBookmarks } from '@/lib/useBookmarks';

function Switch({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      title={label}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${enabled ? 'bg-neutral-200' : 'bg-neutral-800'}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full transition-transform ${
          enabled ? 'translate-x-4 bg-neutral-950' : 'translate-x-0 bg-neutral-500'
        }`}
      />
    </button>
  );
}

export default function Options() {
  const { bookmarks, spaces, loading, status, error, lastSyncedAt, sync, reload } = useBookmarks();
  const [message, setMessage] = useState<string | null>(null);
  const [openInNewTab, setOpenInNewTabState] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getOpenInNewTab().then(setOpenInNewTabState);
  }, []);

  async function handleToggleOpenInNewTab() {
    const next = !openInNewTab;
    setOpenInNewTabState(next);
    await setOpenInNewTab(next);
  }

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
      <div className="flex items-center gap-2">
        <a
          href="newtab.html"
          aria-label="Back to New Tab"
          title="Back to New Tab"
          className="-ml-1.5 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </a>
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
      </div>

      <section className="mt-6 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Sync</h2>
        <p className="mt-1 text-xs text-ink-muted">
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
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-hover"
          >
            Sign out of Google
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Behavior</h2>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-ink">Open bookmarks in a new tab</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {openInNewTab
                ? 'Clicking a bookmark opens it in a new tab.'
                : 'Clicking a bookmark navigates the current tab.'}
            </p>
          </div>
          <Switch enabled={openInNewTab} onToggle={handleToggleOpenInNewTab} label="Open bookmarks in a new tab" />
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Backup</h2>
        <p className="mt-1 text-xs text-ink-muted">
          {loading ? 'Loading…' : `${bookmarks.length} bookmarks saved.`}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleExport}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-hover"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-hover"
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

      {message && <p className="mt-4 text-sm text-ink">{message}</p>}
    </main>
  );
}
