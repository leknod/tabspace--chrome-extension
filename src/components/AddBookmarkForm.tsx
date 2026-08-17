import { useEffect, useState } from 'react';

interface Props {
  onAdd: (input: { url: string; title: string; tags?: string[] }) => Promise<void>;
  /** Precargar con la pestaña activa. Solo tiene permisos para eso al abrirse como popup (activeTab). */
  autofill?: boolean;
}

const inputClass =
  'rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition-colors focus:border-neutral-500 focus:ring-2 focus:ring-neutral-800';

export function AddBookmarkForm({ onAdd, autofill = true }: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setSaving(true);
    try {
      await onAdd({
        url: url.trim(),
        title: title.trim(),
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setTitle('');
      setTags('');
      if (!autofill) setUrl('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titulo"
        className={inputClass}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        required
        className={inputClass}
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="tags separados, por, coma"
        className={inputClass}
      />
      <button
        type="submit"
        disabled={saving}
        className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          justSaved ? 'bg-emerald-500 text-white' : 'bg-white text-neutral-950 hover:bg-neutral-200'
        }`}
      >
        {saving ? 'Guardando…' : justSaved ? 'Guardado ✓' : 'Guardar marcador'}
      </button>
    </form>
  );
}
