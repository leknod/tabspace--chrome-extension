/** Fixed id for the space created by default and when migrating old files without spaces. */
export const DEFAULT_SPACE_ID = 'general';
export const DEFAULT_SPACE_NAME = 'General';

export interface Space {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** true when the user deleted it; kept around to reconcile deletion across devices. */
  deleted?: boolean;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  spaceId: string;
  favicon?: string;
  createdAt: number;
  updatedAt: number;
  /** true when the user deleted it; kept around to reconcile deletion across devices. */
  deleted?: boolean;
}

export interface BookmarksFile {
  version: 2;
  spaces: Space[];
  bookmarks: Bookmark[];
}

export interface SyncState {
  lastSyncedAt: number | null;
  driveFileId: string | null;
}
