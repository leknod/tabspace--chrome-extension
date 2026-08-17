import { useEffect, useMemo, useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import { BookmarkBoard } from '@/components/BookmarkBoard';
import { SpaceNav } from '@/components/SpaceNav';
import { useBookmarks } from '@/lib/useBookmarks';

function EditModeSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label="Edit mode"
      title="Edit mode"
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

export default function NewTab() {
  const {
    bookmarks,
    spaces,
    loading,
    deleteBookmark,
    updateBookmark,
    reorderBookmarks,
    addHeader,
    addSpace,
    reorderSpaces,
    renameSpace,
    deleteSpace,
  } = useBookmarks();
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addingHeader, setAddingHeader] = useState(false);
  const [newHeaderName, setNewHeaderName] = useState('');

  const sortedSpaces = useMemo(
    () => spaces.slice().sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt)),
    [spaces],
  );

  useEffect(() => {
    if (activeSpaceId && sortedSpaces.some((s) => s.id === activeSpaceId)) return;
    setActiveSpaceId(sortedSpaces[0]?.id ?? null);
  }, [sortedSpaces, activeSpaceId]);

  const filtered = bookmarks.filter((b) => b.spaceId === activeSpaceId);

  async function handleAddHeader(e: React.FormEvent) {
    e.preventDefault();
    const name = newHeaderName.trim();
    if (!name || !activeSpaceId) return;
    await addHeader(activeSpaceId, name);
    setNewHeaderName('');
    setAddingHeader(false);
  }

  return (
    <div className="flex h-screen bg-canvas text-neutral-100">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-500 px-4 py-5">
        <SpaceNav
          spaces={sortedSpaces}
          activeSpaceId={activeSpaceId}
          editMode={editMode}
          onSelect={setActiveSpaceId}
          onReorder={reorderSpaces}
          onCreate={addSpace}
          onRename={renameSpace}
          onDelete={deleteSpace}
        />

        <div className="mt-4 flex items-center justify-end gap-2 self-end">
          <EditModeSwitch enabled={editMode} onToggle={() => setEditMode((v) => !v)} />
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="flex items-center justify-center rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-x-auto px-8 py-6">
        {editMode && (
          <div className="mb-4 shrink-0">
            {addingHeader ? (
              <form onSubmit={handleAddHeader} className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newHeaderName}
                  onChange={(e) => setNewHeaderName(e.target.value)}
                  onBlur={() => {
                    if (!newHeaderName.trim()) setAddingHeader(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setNewHeaderName('');
                      setAddingHeader(false);
                    }
                  }}
                  placeholder="Header name"
                  className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
                />
              </form>
            ) : (
              <button
                onClick={() => setAddingHeader(true)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-left text-sm text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-neutral-300"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                Add header
              </button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1">
          <BookmarkBoard
            bookmarks={filtered}
            spaces={spaces}
            editMode={editMode}
            onDelete={deleteBookmark}
            onUpdate={updateBookmark}
            onReorder={reorderBookmarks}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
}
