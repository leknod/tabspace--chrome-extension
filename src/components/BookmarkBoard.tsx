import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import type { Bookmark, Space } from '@/lib/types';
import { useRemovingTransition } from '@/lib/useRemovingTransition';
import { Favicon } from './Favicon';

interface Props {
  bookmarks: Bookmark[];
  spaces: Space[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { title: string; url: string; spaceId: string }) => Promise<void>;
  loading?: boolean;
}

const editInputClass =
  'rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 outline-none transition-colors focus:border-neutral-500';

function SkeletonRow() {
  return <div className="h-4 w-full max-w-sm animate-pulse rounded bg-neutral-800" />;
}

interface EditRowProps {
  bookmark: Bookmark;
  spaces: Space[];
  onCancel: () => void;
  onSave: (updates: { title: string; url: string; spaceId: string }) => Promise<void>;
}

function EditRow({ bookmark, spaces, onCancel, onSave }: EditRowProps) {
  const [title, setTitle] = useState(bookmark.title);
  const [url, setUrl] = useState(bookmark.url);
  const [spaceId, setSpaceId] = useState(bookmark.spaceId);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), url: url.trim(), spaceId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 rounded-md border border-neutral-800 bg-neutral-900/50 p-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={editInputClass}
      />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." required className={editInputClass} />
      <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className={editInputClass}>
        {spaces.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-emerald-400 disabled:opacity-50"
          aria-label="Save"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}

/** Flat list of bookmarks, sorted by title. */
export function BookmarkBoard({ bookmarks, spaces, onDelete, onUpdate, loading }: Props) {
  const { removingIds, requestDelete } = useRemovingTransition(onDelete);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-neutral-700" aria-hidden="true">
          <path
            d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5v18l-6-3.6-6 3.6v-18Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-sm text-neutral-500">No bookmarks yet. Add one with the button on the left.</p>
      </div>
    );
  }

  const sorted = bookmarks.slice().sort((a, b) => a.title.localeCompare(b.title));

  return (
    <ul className="flex max-w-sm flex-col gap-3">
      {sorted.map((b) =>
        editingId === b.id ? (
          <li key={b.id}>
            <EditRow
              bookmark={b}
              spaces={spaces}
              onCancel={() => setEditingId(null)}
              onSave={async (updates) => {
                await onUpdate(b.id, updates);
                setEditingId(null);
              }}
            />
          </li>
        ) : (
          <li
            key={b.id}
            className={`group flex items-center gap-2 transition-all duration-150 ease-out ${
              removingIds.has(b.id) ? 'pointer-events-none -translate-x-1 opacity-0' : 'opacity-100'
            }`}
          >
            <Favicon url={b.url} favicon={b.favicon} className="h-4 w-4 shrink-0 rounded-sm text-neutral-500" />
            <a
              href={b.url}
              className="truncate text-sm text-neutral-200 transition-colors hover:text-white"
              title={b.title}
            >
              {b.title}
            </a>
            <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <button
                onClick={() => setEditingId(b.id)}
                className="text-neutral-600 transition-colors hover:text-neutral-200 focus-visible:outline-none"
                aria-label={`Edit ${b.title}`}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={() => requestDelete(b.id)}
                className="text-xs text-neutral-600 transition-colors hover:text-red-400 focus-visible:outline-none"
                aria-label={`Delete ${b.title}`}
              >
                ✕
              </button>
            </div>
          </li>
        ),
      )}
    </ul>
  );
}
