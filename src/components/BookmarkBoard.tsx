import { useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Pencil, X } from 'lucide-react';
import type { Bookmark, Space } from '@/lib/types';
import type { HeaderStyle } from '@/lib/storage';
import { useRemovingTransition } from '@/lib/useRemovingTransition';
import { Favicon } from './Favicon';

interface Props {
  bookmarks: Bookmark[];
  spaces: Space[];
  editMode: boolean;
  openInNewTab: boolean;
  headerStyle?: HeaderStyle;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { title: string; url: string; spaceId: string }) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  loading?: boolean;
}

function HeaderContent({ title, style }: { title: string; style: HeaderStyle }) {
  if (style === 'pill-center') {
    return (
      <div className="flex items-center gap-2">
        <span className="h-px flex-1 bg-line" />
        <span className="shrink-0 rounded-full border border-line/60 bg-surface/80 px-2.5 py-0.5 text-xs font-medium text-ink-muted dark:border-transparent dark:bg-surface dark:font-semibold">
          {title}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
    );
  }
  if (style === 'pill-full') {
    return (
      <span className="block w-full rounded-md border border-line/60 bg-surface/80 px-2.5 py-0.5 text-xs font-medium text-ink-muted dark:border-transparent dark:bg-surface dark:font-semibold">
        {title}
      </span>
    );
  }
  // simple
  return (
    <span className="block min-w-0 truncate text-sm font-semibold text-ink">
      {title}
    </span>
  );
}

function ViewRow({ bookmark, openInNewTab, headerStyle = 'simple' }: { bookmark: Bookmark; openInNewTab: boolean; headerStyle?: HeaderStyle }) {
  if (bookmark.isHeader) {
    const isSimple = headerStyle === 'simple';
    return (
      <li className={`break-inside-avoid break-after-avoid first:mt-0 ${isSimple ? 'mb-1 mt-10 border-b border-line pb-1.5' : 'mb-3 mt-10'
        }`}>
        <HeaderContent title={bookmark.title} style={headerStyle} />
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
        className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors hover:bg-surface-hover"
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
  headerStyle?: HeaderStyle;
  groupDragging?: boolean;
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
  headerStyle = 'simple',
  groupDragging = false,
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
    const isSimple = headerStyle === 'simple';
    return (
      <li
        ref={setNodeRef}
        style={style}
        className={`group break-inside-avoid break-after-avoid transition-all duration-150 ease-out first:mt-0 ${isSimple ? 'mb-1 mt-10 border-b border-line pb-1.5' : 'mb-3 mt-12'
          } ${removing ? 'pointer-events-none -translate-x-1 opacity-0' : isDragging ? 'opacity-25' : 'opacity-100'}`}
      >
        <div className="flex items-center gap-1">
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab touch-none text-ink-subtle opacity-0 transition-opacity hover:text-ink-muted focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
            aria-label={`Reorder ${bookmark.title}`}
          >
            <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <div className="min-w-0 flex-1">
            <HeaderContent title={bookmark.title} style={headerStyle} />
          </div>
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
        </div>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group mb-3 flex items-center gap-1 break-inside-avoid transition-all duration-150 ease-out ${removing ? 'pointer-events-none -translate-x-1 opacity-0' : isDragging ? 'opacity-25' : groupDragging ? 'opacity-25' : 'opacity-100'
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
        className="truncate text-sm text-ink transition-colors hover:opacity-80"
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
export function BookmarkBoard({ bookmarks, spaces, editMode, openInNewTab, headerStyle = 'simple', onDelete, onUpdate, onReorder, loading }: Props) {
  const { removingIds, requestDelete } = useRemovingTransition(onDelete);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingHeaderId, setDraggingHeaderId] = useState<string | null>(null);
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
          <ViewRow key={b.id} bookmark={b} openInNewTab={openInNewTab} headerStyle={headerStyle} />
        ))}
      </ul>
    );
  }

  const ids = sorted.map((b) => b.id);

  const activeBookmark = activeId ? sorted.find((b) => b.id === activeId) : null;
  const previewChildren = activeBookmark?.isHeader
    ? sorted.filter((b) => b.headerId === activeBookmark.id).slice(0, 3)
    : [];

  function handleDragStart(event: DragStartEvent) {
    const draggedId = String(event.active.id);
    setActiveId(draggedId);
    const dragged = sorted.find((b) => b.id === draggedId);
    if (dragged?.isHeader) setDraggingHeaderId(draggedId);
  }

  function handleDragCancel() {
    setActiveId(null);
    setDraggingHeaderId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setDraggingHeaderId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedId = String(active.id);
    const overId = String(over.id);
    const dragged = sorted.find((b) => b.id === draggedId);

    if (dragged?.isHeader) {
      // Group-drag: move the header + all its children as a block
      const groupIds = new Set([draggedId, ...sorted.filter((b) => b.headerId === draggedId).map((b) => b.id)]);
      const remaining = ids.filter((id) => !groupIds.has(id));
      const block = ids.filter((id) => groupIds.has(id)); // preserves internal order

      // Find where the "over" item sits in the remaining list (after removing the group)
      let insertIndex = remaining.indexOf(overId);
      if (insertIndex === -1) {
        // "over" was inside the group itself, no-op
        return;
      }

      // If dropping after the target, insert after it
      const firstInBlock = block[0];
      if (!firstInBlock) return;
      const oldFirst = ids.indexOf(firstInBlock);
      const overOriginal = ids.indexOf(overId);
      if (overOriginal > oldFirst) insertIndex += 1;

      const reordered = [...remaining.slice(0, insertIndex), ...block, ...remaining.slice(insertIndex)];
      void onReorder(reordered);
    } else {
      // Single bookmark drag
      const oldIndex = ids.indexOf(draggedId);
      const newIndex = ids.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;
      void onReorder(arrayMove(ids, oldIndex, newIndex));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
              headerStyle={headerStyle}
              groupDragging={draggingHeaderId !== null && b.headerId === draggingHeaderId}
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
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeBookmark ? (
          activeBookmark.isHeader ? (
            <div className="pointer-events-none w-[220px] select-none drop-shadow-md">
              <div className={`flex items-center gap-1 ${headerStyle === 'simple' ? 'border-b border-line pb-1.5' : ''}`}>
                <div className="shrink-0 text-ink-muted">
                  <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <HeaderContent title={activeBookmark.title} style={headerStyle} />
                </div>
              </div>

              {previewChildren.length > 0 && (
                <ul className="mt-3 flex flex-col gap-3">
                  {previewChildren.map((child, index) => {
                    const opacityClass =
                      index === 0 ? 'opacity-75' : index === 1 ? 'opacity-50' : 'opacity-25';
                    const isEllipsis = index === 2;
                    return (
                      <li
                        key={child.id}
                        className={`flex items-center gap-1 text-sm text-ink ${opacityClass}`}
                      >
                        <div className="shrink-0 text-ink-muted">
                          <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
                        </div>
                        {!isEllipsis && (
                          <Favicon url={child.url} favicon={child.favicon} className="h-4 w-4 shrink-0 rounded-sm text-ink-faint" />
                        )}
                        <span className="truncate">{isEllipsis ? '...' : child.title}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="pointer-events-none flex w-[220px] select-none items-center gap-1 text-sm text-ink drop-shadow-md">
              <div className="shrink-0 text-ink-muted">
                <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <Favicon url={activeBookmark.url} favicon={activeBookmark.favicon} className="h-4 w-4 shrink-0 rounded-sm text-ink-faint" />
              <span className="truncate text-ink">{activeBookmark.title}</span>
            </div>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
