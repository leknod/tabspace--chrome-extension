import { dropInvalidToken, getAuthToken } from './auth';
import type { BookmarksFile } from './types';

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const FILE_NAME = 'bookmarks.json';

const EMPTY_FILE: BookmarksFile = { version: 1, bookmarks: [] };

async function authedFetch(input: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getAuthToken(true);
  const res = await fetch(input, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 && retry) {
    await dropInvalidToken(token);
    return authedFetch(input, init, false);
  }

  return res;
}

/** Busca el bookmarks.json dentro de la carpeta privada de la app (appDataFolder). */
export async function findFileId(): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${FILE_NAME}' and trashed=false`,
    fields: 'files(id,name,modifiedTime)',
    pageSize: '1',
  });

  const res = await authedFetch(`${DRIVE_FILES_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Drive files.list fallo: ${res.status}`);

  const data = (await res.json()) as { files?: Array<{ id: string }> };
  return data.files?.[0]?.id ?? null;
}

export async function readBookmarksFile(fileId: string): Promise<BookmarksFile> {
  const res = await authedFetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`);
  if (!res.ok) throw new Error(`Drive files.get fallo: ${res.status}`);

  const text = await res.text();
  if (!text.trim()) return EMPTY_FILE;

  try {
    const parsed = JSON.parse(text) as BookmarksFile;
    return { version: 1, bookmarks: parsed.bookmarks ?? [] };
  } catch {
    return EMPTY_FILE;
  }
}

async function createFile(data: BookmarksFile): Promise<string> {
  const metadata = { name: FILE_NAME, parents: ['appDataFolder'] };
  const boundary = 'tabspace-boundary';
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${JSON.stringify(data)}\r\n` +
    `--${boundary}--`;

  const res = await authedFetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });

  if (!res.ok) throw new Error(`Drive files.create fallo: ${res.status}`);
  const created = (await res.json()) as { id: string };
  return created.id;
}

async function updateFile(fileId: string, data: BookmarksFile): Promise<void> {
  const res = await authedFetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(`Drive files.update fallo: ${res.status}`);
}

/** Crea o actualiza bookmarks.json en appDataFolder. Devuelve el fileId final. */
export async function writeBookmarksFile(data: BookmarksFile, existingFileId: string | null): Promise<string> {
  if (existingFileId) {
    await updateFile(existingFileId, data);
    return existingFileId;
  }
  return createFile(data);
}
