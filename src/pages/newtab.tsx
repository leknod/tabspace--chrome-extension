import { useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import { BookmarkBoard, UNTAGGED_LABEL } from '@/components/BookmarkBoard';
import { useBookmarks } from '@/lib/useBookmarks';

function navClass(active: boolean): string {
  const base = 'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors';
  return active
    ? `${base} bg-neutral-800 text-white`
    : `${base} text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200`;
}

export default function NewTab() {
  const { bookmarks, loading, deleteBookmark } = useBookmarks();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach((b) => set.add(b.tags[0] ?? UNTAGGED_LABEL));
    return [...set].sort();
  }, [bookmarks]);

  const filtered = useMemo(() => {
    if (!activeTag) return bookmarks;
    return bookmarks.filter((b) => (b.tags[0] ?? UNTAGGED_LABEL) === activeTag);
  }, [bookmarks, activeTag]);

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-800 px-4 py-5">
        <div className="mb-8 px-1 text-lg font-semibold text-white">TabSpace</div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <button onClick={() => setActiveTag(null)} className={navClass(activeTag === null)}>
            Todos ({bookmarks.length})
          </button>
          {tags.map((tag) => (
            <button key={tag} onClick={() => setActiveTag(tag)} className={navClass(activeTag === tag)}>
              {tag}
            </button>
          ))}
        </nav>

        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="mt-4 flex w-fit items-center justify-center self-end rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white"
          aria-label="Ajustes"
          title="Ajustes"
        >
          <Settings className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </aside>

      <main className="flex-1 px-8 py-6">
        <BookmarkBoard bookmarks={filtered} onDelete={deleteBookmark} loading={loading} />
      </main>
    </div>
  );
}
