import { PanelRightOpen, X } from 'lucide-react';
import { AddBookmarkForm } from '@/components/AddBookmarkForm';
import { useBookmarks } from '@/lib/useBookmarks';

export default function Popup() {
  const { spaces, addBookmark } = useBookmarks();

  function handleOpenSidePanel() {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' }, () => {
        window.close();
      });
    }
  }

  return (
    <div className="popup-root bg-canvas">
      <div className="flex flex-col">
        <header className="flex items-center justify-between px-4 pt-4">
          <button
            onClick={handleOpenSidePanel}
            className="flex items-center gap-1 text-xs text-ink-faint transition-colors hover:text-ink"
            title="Open TabSpace in Side Panel"
            aria-label="Open side panel"
          >
            <PanelRightOpen className="h-4 w-4" strokeWidth={1.75} />
            <span>Side panel</span>
          </button>
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
