import { X } from 'lucide-react';
import { AddBookmarkForm } from '@/components/AddBookmarkForm';
import { useBookmarks } from '@/lib/useBookmarks';

export default function Popup() {
  const { spaces, addBookmark } = useBookmarks();

  return (
    <div className="popup-root relative overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute left-1/2 -top-24 h-56 w-72 -translate-x-1/2 rounded-full bg-neutral-500/10 blur-3xl" />

      <div className="relative flex flex-col">
        <header className="flex items-center justify-end px-4 pb-2 pt-2">
          <button
            onClick={() => window.close()}
            className="text-neutral-500 transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        <AddBookmarkForm spaces={spaces} onAdd={addBookmark} />
      </div>
    </div>
  );
}
