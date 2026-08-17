import { useEffect, useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import { BookmarkBoard } from '@/components/BookmarkBoard';
import { useBookmarks } from '@/lib/useBookmarks';

function navClass(active: boolean): string {
  const base = 'w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors';
  return active
    ? `${base} bg-neutral-800 text-white`
    : `${base} text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200`;
}

export default function NewTab() {
  const { bookmarks, spaces, loading, deleteBookmark, updateBookmark, addSpace } = useBookmarks();
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');

  useEffect(() => {
    if (activeSpaceId || !spaces[0]) return;
    setActiveSpaceId(spaces[0].id);
  }, [spaces, activeSpaceId]);

  const filtered = bookmarks.filter((b) => b.spaceId === activeSpaceId);

  async function handleCreateSpace(e: React.FormEvent) {
    e.preventDefault();
    const name = newSpaceName.trim();
    if (!name) return;
    const space = await addSpace(name);
    setActiveSpaceId(space.id);
    setNewSpaceName('');
    setCreating(false);
  }

  return (
    <div className="flex min-h-screen bg-canvas text-neutral-100">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-500 px-4 py-5">
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {spaces.map((space) => (
            <button
              key={space.id}
              onClick={() => setActiveSpaceId(space.id)}
              className={navClass(activeSpaceId === space.id)}
            >
              {space.name}
            </button>
          ))}

          {creating ? (
            <form onSubmit={handleCreateSpace} className="mt-1 flex flex-col gap-1 px-1">
              <input
                autoFocus
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                onBlur={() => {
                  if (!newSpaceName.trim()) setCreating(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setNewSpaceName('');
                    setCreating(false);
                  }
                }}
                placeholder="Space name"
                className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
              />
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-neutral-300"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              New space
            </button>
          )}
        </nav>

        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="mt-4 flex w-fit items-center justify-center self-end rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white"
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </aside>

      <main className="flex-1 px-8 py-6">
        <BookmarkBoard
          bookmarks={filtered}
          spaces={spaces}
          onDelete={deleteBookmark}
          onUpdate={updateBookmark}
          loading={loading}
        />
      </main>
    </div>
  );
}
