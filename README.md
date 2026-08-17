# TabSpace

Chrome extension (Manifest V3) for saving your own bookmarks, synced with the
app's private folder in your Google Drive (`appDataFolder`): it doesn't show
up in your regular Drive, and only this app can read or write it.

## Surfaces

For now the extension has only three screens, on purpose:

- **New tab** (`newtab.tsx`): the central piece of the extension. A dark
  dashboard listing your bookmarks.
- **Popup** (`popup.tsx`): opens when you click the extension icon. It's just
  a quick form to save the active tab, with visual confirmation on save — it
  doesn't list or manage bookmarks.
- **Settings** (`options.tsx`): manual sync, sign out, export/import JSON.

(There was a side panel at one point; it was removed to keep the scope
small. If needed later, it can be added back with Chrome's Side Panel API.)

## Stack

- **UI**: Next.js (Pages Router, `output: 'export'`) + TypeScript + Tailwind.
  Each `src/pages/*.tsx` compiles to its corresponding static `.html`.
- **Background**: MV3 service worker in TypeScript (`src/background`),
  bundled separately with esbuild (Next doesn't compile service workers).
- **Data**: Google Drive API v3, a single `bookmarks.json` file inside
  `appDataFolder`. Local cache in `chrome.storage.local` with "last write
  wins" sync (by `updatedAt`) to allow offline use.
- **Auth**: `chrome.identity.getAuthToken` (uses the Chrome session, no need
  to handle redirect URIs manually).

## Structure

```
src/
  pages/          newtab.tsx, popup.tsx, options.tsx, _app.tsx, _document.tsx
  components/     UI (bookmarks dashboard, form, favicon)
  lib/            auth.ts, drive.ts, storage.ts, sync.ts, types.ts, useBookmarks.ts
  background/     service worker ("Save to TabSpace" context menu)
manifest.template.json   manifest template (client_id is injected at build time)
scripts/build.mjs        orchestrates next build + esbuild + copies everything to dist/
scripts/generate-extension-key.mjs   pins the extension ID for dev
```

## 1. Install dependencies

```
npm install
```

## 2. Create the OAuth Client ID in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and
   create (or reuse) a project.
2. **APIs & Services -> Library**: enable **Google Drive API**.
3. **APIs & Services -> OAuth consent screen**: set it up in "External" mode
   (or "Internal" if you use Google Workspace), with your email as a test
   user. No verification is needed for personal use.
4. Pin the extension ID before creating the client, so it doesn't change
   every time you reload the extension during development:
   ```
   npm run gen-key
   ```
   Copy the `"key": "..."` it prints into `manifest.template.json`
   (next to `"manifest_version"`), and save the extension ID it shows you.
5. **Credentials -> Create credentials -> OAuth client ID** -> type
   **Chrome Extension**. Paste the extension ID from the previous step as
   the "Item ID".
6. Copy the generated Client ID (`....apps.googleusercontent.com`).

## 3. Configure environment variables

```
cp .env.example .env
```

Then set the Client ID in `GOOGLE_OAUTH_CLIENT_ID`.

## 4. Build and load in Chrome

```
npm run build
```

This generates `dist/` with `manifest.json`, `newtab.html`, `popup.html`,
`options.html`, `background.js`, and icons.

In Chrome: `chrome://extensions` -> enable "Developer mode" -> "Load
unpacked" -> select the `dist/` folder.

Since you pinned the key in the manifest (step 2.4), the ID stays the same
between reloads, so Google sign-in keeps working every time you rebuild and
reload.

## 5. UI development

To iterate quickly on the popup/options design in a regular browser
(without reloading the extension every time):

```
npm run dev
```

Open `http://localhost:3000/newtab`, `/popup`, or `/options`. Note: `chrome.*`
doesn't exist there, so Drive/identity calls will fail in that mode; it's
mainly useful for laying out the UI. To test the real flow (login, save,
sync) you need to build (`npm run build`) and reload the extension.

## Notes

- The only scope requested is `drive.appdata`: the extension never sees or
  touches your regular Drive files.
- The icons in `public/icons/` are a script-generated placeholder; replace
  them once you have a final design.
- Deleted bookmarks are marked with `deleted: true` instead of being fully
  removed, so the deletion propagates across devices on the next sync
  instead of "reviving" the bookmark.
