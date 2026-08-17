import { getLocalBookmarks, newId, setLocalBookmarks } from '../lib/storage';
import { syncBookmarks } from '../lib/sync';
import type { Bookmark } from '../lib/types';

const CONTEXT_MENU_ID = 'tabspace-add-current-tab';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Guardar en TabSpace',
    contexts: ['page', 'link'],
  });
});

async function addBookmark(url: string, title: string): Promise<void> {
  const now = Date.now();
  const bookmark: Bookmark = {
    id: newId(),
    url,
    title: title || url,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };

  const current = await getLocalBookmarks();
  await setLocalBookmarks([...current, bookmark]);
  await syncBookmarks().catch((err) => console.error('[tabspace] sync fallo', err));
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const url = info.linkUrl ?? tab?.url;
  if (!url) return;
  void addBookmark(url, tab?.title ?? url);
});

// Permite que popup/options pidan una sincronizacion sin duplicar la logica.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SYNC_NOW') {
    syncBookmarks()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // respuesta asincrona
  }
  return false;
});
