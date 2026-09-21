import { getLastUsedSpaceId, getLocalBookmarks, newId, setLocalBookmarks } from '../lib/storage';
import { syncBookmarks } from '../lib/sync';
import type { Bookmark } from '../lib/types';

const CONTEXT_MENU_ADD_ID = 'tabspace-add-current-tab';
const CONTEXT_MENU_SIDE_PANEL_ID = 'tabspace-open-side-panel';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ADD_ID,
    title: 'Save to TabSpace',
    contexts: ['page', 'link'],
  });
  chrome.contextMenus.create({
    id: CONTEXT_MENU_SIDE_PANEL_ID,
    title: 'Open TabSpace side panel',
    contexts: ['all'],
  });
});

async function addBookmark(url: string, title: string): Promise<void> {
  const now = Date.now();
  const bookmark: Bookmark = {
    id: newId(),
    url,
    title: title || url,
    spaceId: await getLastUsedSpaceId(),
    order: now,
    createdAt: now,
    updatedAt: now,
  };

  const current = await getLocalBookmarks();
  await setLocalBookmarks([...current, bookmark]);
  await syncBookmarks().catch((err) => console.error('[tabspace] sync failed', err));
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ADD_ID) {
    const url = info.linkUrl ?? tab?.url;
    if (!url) return;
    void addBookmark(url, tab?.title ?? url);
  } else if (info.menuItemId === CONTEXT_MENU_SIDE_PANEL_ID) {
    if (tab?.windowId !== undefined && chrome.sidePanel?.open) {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
    }
  }
});

// Lets the popup/options/sidepanel request a sync without duplicating the logic.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SYNC_NOW') {
    syncBookmarks()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // async response
  }
  if (message?.type === 'OPEN_SIDE_PANEL') {
    chrome.windows.getCurrent((win) => {
      const windowId = win.id ?? sender.tab?.windowId;
      if (windowId !== undefined && chrome.sidePanel?.open) {
        chrome.sidePanel.open({ windowId })
          .then(() => sendResponse({ ok: true }))
          .catch((err) => sendResponse({ ok: false, error: String(err) }));
      } else {
        sendResponse({ ok: false, error: 'Side panel not available' });
      }
    });
    return true;
  }
  return false;
});
