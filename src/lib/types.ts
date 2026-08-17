export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  tags: string[];
  favicon?: string;
  createdAt: number;
  updatedAt: number;
  /** 1 cuando el usuario lo borró; se conserva para reconciliar el borrado entre dispositivos. */
  deleted?: boolean;
}

export interface BookmarksFile {
  version: 1;
  bookmarks: Bookmark[];
}

export interface SyncState {
  lastSyncedAt: number | null;
  driveFileId: string | null;
}
