import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Folder, Link2, Save } from 'lucide-react';
import { getLastUsedSpaceId } from '@/lib/storage';
import type { Space } from '@/lib/types';
import { Favicon } from './Favicon';

interface Props {
  spaces: Space[];
  onAdd: (input: { url: string; title: string; spaceId: string }) => Promise<void>;
  /** Prefill with the active tab. Only has permission to do that when opened as a popup (activeTab). */
  autofill?: boolean;
  /** Called after a successful save, once the "Saved" confirmation has shown. */
  onSaved?: () => void;
}

const labelClass = 'mb-1.5 block text-sm text-ink-muted';
const fieldWrapClass =
  'flex items-center gap-2 rounded-lg border border-line bg-surface/60 px-3 py-2.5 transition-colors focus-within:border-line-focus';
const fieldInputClass = 'w-full min-w-0 bg-transparent text-sm text-ink placeholder-ink-faint outline-none';

function SpaceField({ spaces, value, onChange }: { spaces: Space[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = spaces.find((s) => s.id === value);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={`${fieldWrapClass} w-full`}>
        <Folder className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate text-left text-sm text-ink">{current?.name ?? 'Select a space'}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-10 mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg"
        >
          {spaces.map((s) => (
            <li key={s.id} role="option" aria-selected={s.id === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
                className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                  s.id === value ? 'bg-surface-hover text-ink' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
                }`}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AddBookmarkForm({ spaces, onAdd, autofill = true, onSaved }: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!autofill) return;
    if (typeof chrome === 'undefined' || !chrome.tabs) return;
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url) setUrl(tab.url);
      if (tab?.title) setTitle(tab.title);
    });
  }, [autofill]);

  useEffect(() => {
    void getLastUsedSpaceId().then(setSpaceId);
  }, []);

  useEffect(() => {
    if (spaceId && !spaces.some((s) => s.id === spaceId)) setSpaceId('');
  }, [spaces, spaceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    const targetSpaceId = spaceId || spaces[0]?.id;
    if (!targetSpaceId) return;

    setSaving(true);
    try {
      await onAdd({
        url: url.trim(),
        title: title.trim(),
        spaceId: targetSpaceId,
      });
      setTitle('');
      if (!autofill) setUrl('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  const currentSpaceId = spaceId || spaces[0]?.id || '';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 pb-4 pt-2">
      <div>
        <label className={labelClass}>Name</label>
        <div className={fieldWrapClass}>
          <Favicon key={url} url={url} className="h-4 w-4 shrink-0 rounded-sm text-ink-faint" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={fieldInputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>URL</label>
        <div className={fieldWrapClass}>
          <Link2 className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            required
            className={fieldInputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Space</label>
        <SpaceField spaces={spaces} value={currentSpaceId} onChange={setSpaceId} />
      </div>

      <button
        type="submit"
        disabled={saving}
        className={`mt-1 flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
          justSaved ? 'border-line-focus bg-surface-hover text-ink' : 'border-line bg-surface text-ink hover:bg-surface-hover'
        }`}
      >
        <Save className="h-4 w-4" strokeWidth={1.75} />
        {saving ? 'Saving…' : justSaved ? 'Saved ✓' : 'Save Bookmark'}
      </button>
    </form>
  );
}
