import { X } from 'lucide-react';
import { AddBookmarkForm } from '@/components/AddBookmarkForm';
import { useBookmarks } from '@/lib/useBookmarks';

export default function Popup() {
  const { spaces, addBookmark } = useBookmarks();

  return (
    <div className="popup-root bg-canvas">
      <div className="flex flex-col">
        <header className="flex items-center justify-end px-4 pt-4">
          <button
            onClick={() => window.close()}
            className="text-ink-faint transition-colors hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </header>

        <AddBookmarkForm spaces={spaces} onAdd={addBookmark} onSaved={() => setTimeout(() => window.close(), 700)} />
      </div>
    </div>
  );
}
