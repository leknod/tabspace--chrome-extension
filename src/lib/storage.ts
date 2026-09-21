import { DEFAULT_SPACE_ID } from './types';
import type { Bookmark, Space, SyncState } from './types';

const BOOKMARKS_KEY = 'bookmarks';
const SPACES_KEY = 'spaces';
const SYNC_STATE_KEY = 'syncState';
const LAST_USED_SPACE_KEY = 'lastUsedSpaceId';
const OPEN_IN_NEW_TAB_KEY = 'openInNewTab';
const HEADER_STYLE_KEY = 'headerStyle';

/**
 * chrome.storage.local only exists inside the extension. Outside it (e.g. `npm run dev`
 * in a regular browser tab) fall back to an in-memory store, so pages still render and
 * can be interacted with for UI work instead of crashing on the first chrome.* call.
 */
const memoryStore = new Map<string, unknown>();
const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage?.local;

async function getKey<T>(key: string): Promise<T | undefined> {
  if (hasChromeStorage) {
    const result = await chrome.storage.local.get(key);
    return result[key] as T | undefined;
  }
  return memoryStore.get(key) as T | undefined;
}

async function setKey(key: string, value: unknown): Promise<void> {
  if (hasChromeStorage) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  memoryStore.set(key, value);
}

export async function getLocalBookmarks(): Promise<Bookmark[]> {
  return (await getKey<Bookmark[]>(BOOKMARKS_KEY)) ?? [];
}

export async function setLocalBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await setKey(BOOKMARKS_KEY, bookmarks);
}

export async function getLocalSpaces(): Promise<Space[]> {
  return (await getKey<Space[]>(SPACES_KEY)) ?? [];
}

export async function setLocalSpaces(spaces: Space[]): Promise<void> {
  await setKey(SPACES_KEY, spaces);
}

export async function getSyncState(): Promise<SyncState> {
  return (await getKey<SyncState>(SYNC_STATE_KEY)) ?? { lastSyncedAt: null, driveFileId: null };
}

export async function setSyncState(state: SyncState): Promise<void> {
  await setKey(SYNC_STATE_KEY, state);
}

/** Space used the last time a bookmark was saved; used as the default in the popup and the context menu. */
export async function getLastUsedSpaceId(): Promise<string> {
  return (await getKey<string>(LAST_USED_SPACE_KEY)) ?? DEFAULT_SPACE_ID;
}

export async function setLastUsedSpaceId(id: string): Promise<void> {
  await setKey(LAST_USED_SPACE_KEY, id);
}

/** Whether clicking a bookmark opens it in a new tab instead of navigating the current one. */
export async function getOpenInNewTab(): Promise<boolean> {
  return (await getKey<boolean>(OPEN_IN_NEW_TAB_KEY)) ?? false;
}

export async function setOpenInNewTab(value: boolean): Promise<void> {
  await setKey(OPEN_IN_NEW_TAB_KEY, value);
}

export type HeaderStyle = 'simple' | 'pill-center' | 'pill-full';

/** Visual style used to render section headers inside a space. */
export async function getHeaderStyle(): Promise<HeaderStyle> {
  return (await getKey<HeaderStyle>(HEADER_STYLE_KEY)) ?? 'simple';
}

export async function setHeaderStyle(value: HeaderStyle): Promise<void> {
  await setKey(HEADER_STYLE_KEY, value);
}

export type ThemeSetting = 'system' | 'light' | 'dark';
const THEME_KEY = 'theme';

/** User theme choice: 'system', 'light', or 'dark'. */
export async function getTheme(): Promise<ThemeSetting> {
  return (await getKey<ThemeSetting>(THEME_KEY)) ?? 'system';
}

export async function setTheme(value: ThemeSetting): Promise<void> {
  await setKey(THEME_KEY, value);
}

/** Applies the chosen theme to the document root element. */
export function applyTheme(theme: ThemeSetting): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else if (theme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  } else {
    // system
    root.classList.remove('light', 'dark');
    root.style.colorScheme = '';
  }
}

export function newId(): string {
  return crypto.randomUUID();
}

