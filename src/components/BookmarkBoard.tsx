import { useState } from 'react';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Pencil, X } from 'lucide-react';
import type { Bookmark, Space } from '@/lib/types';
import { useRemovingTransition } from '@/lib/useRemovingTransition';
import { Favicon } from './Favicon';

interface Props {
  bookmarks: Bookmark[];
  spaces: Space[];
  editMode: boolean;
  openInNewTab: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { title: string; url: string; spaceId: string }) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  loading?: boolean;
}

function ViewRow({ bookmark, openInNewTab }: { bookmark: Bookmark; openInNewTab: boolean }) {
  if (bookmark.isHeader) {
    return (
      <li className="mb-1 mt-6 flex items-center break-inside-avoid break-after-avoid border-b border-line pb-1.5 first:mt-0">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
          {bookmark.title}
        </span>
      </li>
    );
  }

  return (
    <li className="mb-1 break-inside-avoid">
      <a
        href={bookmark.url}
        title={bookmark.title}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-200 transition-colors hover:bg-surface hover:text-ink"
      >
        <Favicon url={bookmark.url} favicon={bookmark.favicon} className="h-4 w-4 shrink-0 rounded-sm text-ink-faint" />
        <span className="truncate">{bookmark.title}</span>
      </a>
    </li>
  );
}

const editInputClass =
  'rounded-md border border-line bg-surface px-2 py-1 text-sm text-ink outline-none transition-colors focus:border-line-focus';

function SkeletonRow() {
  return <div className="h-4 w-full max-w-sm animate-pulse rounded bg-surface-hover" />;
}

interface EditRowProps {
  bookmark: Bookmark;
  spaces: Space[];
  onCancel: () => void;
  onSave: (updates: { title: string; url: string; spaceId: string }) => Promise<void>;
}

function EditRow({ bookmark, spaces, onCancel, onSave }: EditRowProps) {
  const isHeader = bookmark.isHeader ?? false;
  const [title, setTitle] = useState(bookmark.title);
  const [url, setUrl] = useState(bookmark.url);
  const [spaceId, setSpaceId] = useState(bookmark.spaceId);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isHeader && !url.trim()) return;
    if (isHeader && !title.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), url: isHeader ? '' : url.trim(), spaceId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 rounded-md border border-line bg-surface/50 p-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={isHeader ? 'Header' : 'Title'}
        className={editInputClass}
      />
      {!isHeader && (
        <>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." required className={editInputClass} />
          <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className={editInputClass}>
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </>
      )}
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-hover hover:text-emerald-400 disabled:opacity-50"
          aria-label="Save"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}

interface SortableRowProps {
  bookmark: Bookmark;
  spaces: Space[];
  editing: boolean;
  removing: boolean;
  openInNewTab: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (updates: { title: string; url: string; spaceId: string }) => Promise<void>;
}

function SortableRow({
  bookmark,
  spaces,
  editing,
  removing,
  openInNewTab,
  onEdit,
  onDelete,
  onCancelEdit,
  onSaveEdit,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bookmark.id,
    disabled: editing,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  if (editing) {
    return (
      <li ref={setNodeRef} style={style} className="mb-3 break-inside-avoid">
        <EditRow bookmark={bookmark} spaces={spaces} onCancel={onCancelEdit} onSave={onSaveEdit} />
      </li>
    );
  }

  if (bookmark.isHeader) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className={`group mb-3 mt-8 flex items-center gap-1 break-inside-avoid break-after-avoid border-b border-line pb-1.5 transition-all duration-150 ease-out first:mt-0 ${
          removing ? 'pointer-events-none -translate-x-1 opacity-0' : isDragging ? 'opacity-40' : 'opacity-100'
        }`}
      >
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none text-ink-subtle opacity-0 transition-opacity hover:text-ink-muted focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
          aria-label={`Reorder ${bookmark.title}`}
        >
          <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
          {bookmark.title}
        </span>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="text-ink-subtle transition-colors hover:text-ink focus-visible:outline-none"
            aria-label={`Edit ${bookmark.title}`}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-ink-subtle transition-colors hover:text-red-400 focus-visible:outline-none"
            aria-label={`Delete ${bookmark.title}`}
          >
            ✕
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group mb-3 flex items-center gap-1 break-inside-avoid transition-all duration-150 ease-out ${
        removing ? 'pointer-events-none -translate-x-1 opacity-0' : isDragging ? 'opacity-40' : 'opacity-100'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none text-ink-subtle opacity-0 transition-opacity hover:text-ink-muted focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
        aria-label={`Reorder ${bookmark.title}`}
      >
        <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <Favicon url={bookmark.url} favicon={bookmark.favicon} className="h-4 w-4 shrink-0 rounded-sm text-ink-faint" />
      <a
        href={bookmark.url}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        className="truncate text-sm text-neutral-200 transition-colors hover:text-ink"
        title={bookmark.title}
      >
        {bookmark.title}
      </a>
      <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="text-ink-subtle transition-colors hover:text-ink focus-visible:outline-none"
          aria-label={`Edit ${bookmark.title}`}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-ink-subtle transition-colors hover:text-red-400 focus-visible:outline-none"
          aria-label={`Delete ${bookmark.title}`}
        >
          ✕
        </button>
      </div>
    </li>
  );
}

/** Bookmarks laid out in flowing columns, in manual drag-and-drop order (falls back to creation order). */
export function BookmarkBoard({ bookmarks, spaces, editMode, openInNewTab, onDelete, onUpdate, onReorder, loading }: Props) {
  const { removingIds, requestDelete } = useRemovingTransition(onDelete);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-ink-subtle" aria-hidden="true">
          <path
            d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5v18l-6-3.6-6 3.6v-18Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-sm text-ink-faint">No bookmarks yet.</p>
      </div>
    );
  }

  const sorted = bookmarks.slice().sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));

  if (!editMode) {
    return (
      <ul className="h-full columns-[220px] gap-x-8 [column-fill:auto]">
        {sorted.map((b) => (
          <ViewRow key={b.id} bookmark={b} openInNewTab={openInNewTab} />
        ))}
      </ul>
    );
  }

  const ids = sorted.map((b) => b.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    void onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <ul className="h-full columns-[220px] gap-x-8 [column-fill:auto]">
          {sorted.map((b) => (
            <SortableRow
              key={b.id}
              bookmark={b}
              spaces={spaces}
              editing={editingId === b.id}
              removing={removingIds.has(b.id)}
              openInNewTab={openInNewTab}
              onEdit={() => setEditingId(b.id)}
              onDelete={() => requestDelete(b.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={async (updates) => {
                await onUpdate(b.id, updates);
                setEditingId(null);
              }}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
