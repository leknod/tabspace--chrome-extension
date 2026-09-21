import { useEffect, useState } from 'react';
import {
  LayoutGrid,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { SidePanelTreeView } from '@/components/SidePanelTreeView';
import { getHeaderStyle, getOpenInNewTab } from '@/lib/storage';
import type { HeaderStyle } from '@/lib/storage';
import { useBookmarks } from '@/lib/useBookmarks';

export default function SidePanel() {
  const { spaces, bookmarks, loading } = useBookmarks();
  const [searchQuery, setSearchQuery] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [headerStyle, setHeaderStyle] = useState<HeaderStyle>('simple');

  useEffect(() => {
    void getOpenInNewTab().then(setOpenInNewTab);
    void getHeaderStyle().then(setHeaderStyle);

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
        if (area === 'local') {
          if (changes.headerStyle) {
            setHeaderStyle((changes.headerStyle.newValue as HeaderStyle) ?? 'simple');
          }
          if (changes.openInNewTab) {
            setOpenInNewTab(Boolean(changes.openInNewTab.newValue));
          }
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }
  }, []);

  async function handleToggleFullBoard() {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const fullBoardUrl = chrome.runtime.getURL('newtab.html');
      const tabs = await chrome.tabs.query({ currentWindow: true });
      
      const isNewTab = (tab: chrome.tabs.Tab) => {
        const u = tab.url || tab.pendingUrl || '';
        return (
          u.startsWith(fullBoardUrl) ||
          u.includes('/newtab.html') ||
          u.includes('/newtab') ||
          u === 'chrome://newtab/' ||
          u === 'chrome://newtab'
        );
      };

      const existingTab = tabs.find(isNewTab);

      if (existingTab?.id !== undefined) {
        if (existingTab.active) {
          await chrome.tabs.remove(existingTab.id);
        } else {
          await chrome.tabs.update(existingTab.id, { active: true });
        }
      } else {
        await chrome.tabs.create({ url: fullBoardUrl });
      }
      return;
    }
    window.open('/newtab', '_blank');
  }

  function handleOpenOptions() {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('/options', '_blank');
    }
  }

  const bookmarkCount = bookmarks.filter((b) => !b.isHeader && !b.deleted).length;

  return (
    <div className="flex h-screen w-full flex-col bg-canvas text-ink select-none">
      {/* Top Header */}
      <header className="flex items-center gap-1.5 border-b border-line bg-surface/80 px-3 py-2 backdrop-blur">
        {/* Search input */}
        <div className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ink-faint" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spaces & bookmarks..."
            className="w-full rounded-md border border-line bg-surface py-1 pl-8 pr-7 text-xs text-ink placeholder-ink-faint outline-none transition-colors focus:border-line-focus"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 rounded p-0.5 text-ink-faint hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center">
          <button
            onClick={handleToggleFullBoard}
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            title="Toggle full board in new tab"
            aria-label="Toggle full board"
          >
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* Main Tree List */}
      <main className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="flex flex-col gap-2 p-2">
            <div className="h-5 w-32 animate-pulse rounded bg-surface-hover" />
            <div className="ml-4 flex flex-col gap-1.5">
              <div className="h-4 w-40 animate-pulse rounded bg-surface-hover" />
              <div className="h-4 w-36 animate-pulse rounded bg-surface-hover" />
            </div>
            <div className="h-5 w-28 animate-pulse rounded bg-surface-hover" />
            <div className="ml-4 flex flex-col gap-1.5">
              <div className="h-4 w-44 animate-pulse rounded bg-surface-hover" />
            </div>
          </div>
        ) : (
          <SidePanelTreeView
            spaces={spaces}
            bookmarks={bookmarks}
            searchQuery={searchQuery}
            openInNewTab={openInNewTab}
            headerStyle={headerStyle}
          />
        )}
      </main>

      {/* Footer / Status bar */}
      <footer className="flex items-center justify-between border-t border-line bg-surface/50 px-3 py-1.5 text-[11px] text-ink-faint">
        <span className="truncate">
          {spaces.length} {spaces.length === 1 ? 'space' : 'spaces'} · {bookmarkCount} {bookmarkCount === 1 ? 'bookmark' : 'bookmarks'}
        </span>

        <button
          onClick={handleOpenOptions}
          className="flex items-center gap-1 text-ink-faint transition-colors hover:text-ink"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="h-3 w-3" strokeWidth={1.75} />
          <span>Settings</span>
        </button>
      </footer>
    </div>
  );
}
