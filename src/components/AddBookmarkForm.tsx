import { useEffect, useState } from 'react';
import { ChevronDown, Folder, Link2, Save } from 'lucide-react';
import { getLastUsedSpaceId } from '@/lib/storage';
import type { Space } from '@/lib/types';
import { Favicon } from './Favicon';

interface Props {
  spaces: Space[];
  onAdd: (input: { url: string; title: string; spaceId: string }) => Promise<void>;
  /** Prefill with the active tab. Only has permission to do that when opened as a popup (activeTab). */
  autofill?: boolean;
}

const labelClass = 'mb-1.5 block text-sm text-neutral-400';
const fieldWrapClass =
  'flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 transition-colors focus-within:border-neutral-500';
const fieldInputClass = 'w-full min-w-0 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 outline-none';

export function AddBookmarkForm({ spaces, onAdd, autofill = true }: Props) {
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
          <Favicon key={url} url={url} className="h-4 w-4 shrink-0 rounded-sm text-neutral-500" />
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
          <Link2 className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
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
        <div className={fieldWrapClass}>
          <Folder className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
          <select
            value={currentSpaceId}
            onChange={(e) => setSpaceId(e.target.value)}
            className="w-full min-w-0 appearance-none bg-transparent text-sm text-neutral-100 outline-none"
          >
            {spaces.map((s) => (
              <option key={s.id} value={s.id} className="bg-neutral-900">
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className={`mt-1 flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
          justSaved
            ? 'border-emerald-500/40 bg-emerald-500'
            : 'border-neutral-700 bg-gradient-to-tr from-neutral-600 via-neutral-900 to-black hover:from-neutral-500'
        }`}
      >
        <Save className="h-4 w-4" strokeWidth={1.75} />
        {saving ? 'Saving…' : justSaved ? 'Saved ✓' : 'Save Bookmark'}
      </button>
    </form>
  );
}
