import { AddBookmarkForm } from '@/components/AddBookmarkForm';
import { useBookmarks } from '@/lib/useBookmarks';

export default function Popup() {
  const { addBookmark } = useBookmarks();

  return (
    <div className="popup-root flex flex-col">
      <header className="flex items-center justify-between px-3 pt-3">
        <h1 className="text-sm font-semibold text-white">TabSpace</h1>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="text-xs text-neutral-400 transition-colors hover:text-white"
        >
          Opciones
        </button>
      </header>

      <AddBookmarkForm onAdd={addBookmark} />
    </div>
  );
}
