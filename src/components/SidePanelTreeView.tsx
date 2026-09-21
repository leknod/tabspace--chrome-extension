import { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Copy,
  Search,
} from 'lucide-react';
import type { Bookmark, Space } from '@/lib/types';
import type { HeaderStyle } from '@/lib/storage';
import { Favicon } from './Favicon';

interface Props {
  spaces: Space[];
  bookmarks: Bookmark[];
  searchQuery: string;
  openInNewTab: boolean;
  headerStyle?: HeaderStyle;
}

function openBookmarkUrl(url: string, newTab: boolean) {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    if (newTab) {
      void chrome.tabs.create({ url });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id !== undefined) {
          void chrome.tabs.update(activeTab.id, { url });
        } else {
          void chrome.tabs.create({ url });
        }
      });
    }
    return;
  }
  window.open(url, newTab ? '_blank' : '_self', 'noopener,noreferrer');
}

interface TreeBookmarkRowProps {
  bookmark: Bookmark;
  openInNewTab: boolean;
}

function TreeBookmarkRow({ bookmark, openInNewTab }: TreeBookmarkRowProps) {
  const [copied, setCopied] = useState(false);

  function handleClick(e: React.MouseEvent) {
    const isModifier = e.ctrlKey || e.metaKey || e.button === 1;
    openBookmarkUrl(bookmark.url, openInNewTab || isModifier);
  }

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(bookmark.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick(e as unknown as React.MouseEvent);
      }}
      className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink transition-colors hover:bg-surface-hover"
      title={`${bookmark.title}\n${bookmark.url}`}
    >
      <Favicon url={bookmark.url} favicon={bookmark.favicon} className="h-4 w-4 shrink-0 rounded-sm text-ink-faint" />
      <span className="min-w-0 flex-1 truncate text-xs text-ink group-hover:text-ink">
        {bookmark.title}
      </span>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded p-1 text-ink-faint transition-colors hover:bg-surface hover:text-ink"
          title={copied ? 'Copied!' : 'Copy URL'}
          aria-label="Copy URL"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
          ) : (
            <Copy className="h-3 w-3" strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}

interface TreeHeaderGroupProps {
  header: Bookmark;
  childrenBookmarks: Bookmark[];
  openInNewTab: boolean;
  headerStyle?: HeaderStyle;
  defaultExpanded?: boolean;
}

function TreeHeaderGroup({
  header,
  childrenBookmarks,
  openInNewTab,
  headerStyle = 'simple',
  defaultExpanded = true,
}: TreeHeaderGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (childrenBookmarks.length === 0) return null;

  return (
    <div className="flex flex-col">
      {headerStyle === 'pill-center' ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-1.5 py-1 pt-2.5 text-left transition-opacity hover:opacity-85"
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 text-ink-faint transition-transform duration-150 ${
              expanded ? 'rotate-90' : ''
            }`}
            strokeWidth={2.5}
          />
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="h-px flex-1 bg-line" />
            <span className="shrink-0 rounded-full border border-line/60 bg-surface/80 px-2.5 py-0.5 text-[11px] font-medium text-ink-muted dark:border-transparent dark:bg-surface dark:font-semibold">
              {header.title}
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <span className="shrink-0 px-1 text-[10px] font-normal text-ink-faint">
            {childrenBookmarks.length}
          </span>
        </button>
      ) : headerStyle === 'pill-full' ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-1.5 py-1 pt-2.5 text-left transition-opacity hover:opacity-85"
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 text-ink-faint transition-transform duration-150 ${
              expanded ? 'rotate-90' : ''
            }`}
            strokeWidth={2.5}
          />
          <div className="flex min-w-0 flex-1 items-center justify-between rounded-md border border-line/60 bg-surface/80 px-2.5 py-0.5 text-[11px] font-medium text-ink-muted dark:border-transparent dark:bg-surface dark:font-semibold">
            <span className="truncate">{header.title}</span>
            <span className="ml-1 text-[10px] font-normal text-ink-faint">
              {childrenBookmarks.length}
            </span>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-1.5 border-b border-line pb-1 pt-2 text-left transition-colors hover:bg-surface-hover/50"
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 text-ink-faint transition-transform duration-150 ${
              expanded ? 'rotate-90' : ''
            }`}
            strokeWidth={2.5}
          />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
            {header.title}
          </span>
          <span className="shrink-0 px-1 text-[10px] font-normal text-ink-faint">
            {childrenBookmarks.length}
          </span>
        </button>
      )}

      {expanded && (
        <div className="ml-2.5 mt-0.5 flex flex-col border-l border-line/60 pl-2">
          {childrenBookmarks.map((bm) => (
            <TreeBookmarkRow key={bm.id} bookmark={bm} openInNewTab={openInNewTab} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TreeSpaceItemProps {
  space: Space;
  bookmarks: Bookmark[];
  openInNewTab: boolean;
  headerStyle?: HeaderStyle;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function TreeSpaceItem({
  space,
  bookmarks,
  openInNewTab,
  headerStyle,
  isExpanded,
  onToggleExpand,
}: TreeSpaceItemProps) {
  const sorted = useMemo(
    () => bookmarks.slice().sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt)),
    [bookmarks],
  );

  const headers = useMemo(() => sorted.filter((b) => b.isHeader), [sorted]);
  const ungrouped = useMemo(() => sorted.filter((b) => !b.isHeader && !b.headerId), [sorted]);
  const totalBookmarkCount = useMemo(() => sorted.filter((b) => !b.isHeader).length, [sorted]);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform duration-150 ${
            isExpanded ? 'rotate-90' : ''
          }`}
          strokeWidth={2.5}
        />
        <span className="min-w-0 flex-1 truncate">{space.name}</span>
        <span className="shrink-0 rounded-full bg-surface-hover px-1.5 py-0.5 text-[11px] font-normal text-ink-muted">
          {totalBookmarkCount}
        </span>
      </button>

      {isExpanded && (
        <div className="ml-3.5 mt-0.5 flex flex-col gap-0.5 border-l border-line/60 pl-2">
          {totalBookmarkCount === 0 ? (
            <p className="py-1 pl-2 text-xs italic text-ink-faint">Empty space</p>
          ) : (
            <>
              {ungrouped.map((bm) => (
                <TreeBookmarkRow key={bm.id} bookmark={bm} openInNewTab={openInNewTab} />
              ))}

              {headers.map((header) => {
                const children = sorted.filter((b) => b.headerId === header.id && !b.isHeader);
                return (
                  <TreeHeaderGroup
                    key={header.id}
                    header={header}
                    childrenBookmarks={children}
                    openInNewTab={openInNewTab}
                    headerStyle={headerStyle}
                    defaultExpanded={true}
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function SidePanelTreeView({
  spaces,
  bookmarks,
  searchQuery,
  openInNewTab,
  headerStyle = 'simple',
}: Props) {
  const sortedSpaces = useMemo(
    () => spaces.slice().sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt)),
    [spaces],
  );

  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (sortedSpaces[0]) {
      initial[sortedSpaces[0].id] = true;
    }
    return initial;
  });

  const query = searchQuery.trim().toLowerCase();

  const filteredData = useMemo(() => {
    if (!query) {
      return sortedSpaces.map((space) => ({
        space,
        bookmarks: bookmarks.filter((b) => b.spaceId === space.id),
      }));
    }

    return sortedSpaces
      .map((space) => {
        const spaceBookmarks = bookmarks.filter((b) => b.spaceId === space.id);
        const spaceMatches = space.name.toLowerCase().includes(query);

        const matchingBookmarks = spaceBookmarks.filter(
          (b) =>
            b.title.toLowerCase().includes(query) ||
            (!b.isHeader && b.url.toLowerCase().includes(query)),
        );

        const matchingHeaders = new Set<string>();
        for (const bm of matchingBookmarks) {
          if (bm.headerId) matchingHeaders.add(bm.headerId);
        }

        const included = spaceBookmarks.filter(
          (b) =>
            spaceMatches ||
            matchingBookmarks.some((m) => m.id === b.id) ||
            matchingHeaders.has(b.id),
        );

        return {
          space,
          bookmarks: spaceMatches ? spaceBookmarks : included,
          hasMatches: spaceMatches || matchingBookmarks.length > 0,
        };
      })
      .filter((item) => !query || item.hasMatches);
  }, [sortedSpaces, bookmarks, query]);

  function toggleExpand(spaceId: string) {
    setExpandedSpaces((prev) => ({
      ...prev,
      [spaceId]: !prev[spaceId],
    }));
  }

  if (filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Search className="mb-2 h-6 w-6 text-ink-faint" />
        <p className="text-sm font-medium text-ink-muted">No matches found</p>
        <p className="text-xs text-ink-faint">Try searching with a different keyword</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-1 py-1">
      {filteredData.map(({ space, bookmarks: spaceBookmarks }) => {
        const isExpanded = query ? true : !!expandedSpaces[space.id];
        return (
          <TreeSpaceItem
            key={space.id}
            space={space}
            bookmarks={spaceBookmarks}
            openInNewTab={openInNewTab}
            headerStyle={headerStyle}
            isExpanded={isExpanded}
            onToggleExpand={() => toggleExpand(space.id)}
          />
        );
      })}
    </div>
  );
}
