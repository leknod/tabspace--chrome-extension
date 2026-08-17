import { useState } from 'react';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Pencil, Plus, X } from 'lucide-react';
import type { Space } from '@/lib/types';
import { useRemovingTransition } from '@/lib/useRemovingTransition';

interface Props {
  /** Already sorted in display order. */
  spaces: Space[];
  activeSpaceId: string | null;
  editMode: boolean;
  onSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onCreate: (name: string) => Promise<Space>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => void;
}

function ViewSpaceButton({ space, active, onSelect }: { space: Space; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active ? 'bg-surface-hover text-ink' : 'text-ink-muted hover:bg-surface hover:text-ink'
      }`}
    >
      {space.name}
    </button>
  );
}

interface EditSpaceRowProps {
  space: Space;
  onCancel: () => void;
  onSave: (name: string) => Promise<void>;
}

function EditSpaceRow({ space, onCancel, onSave }: EditSpaceRowProps) {
  const [name, setName] = useState(space.name);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-1 rounded-lg border border-line bg-surface py-1 pl-2 pr-1"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        className="w-full min-w-0 bg-transparent text-sm text-ink outline-none"
      />
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="submit"
        disabled={saving}
        className="shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-hover hover:text-emerald-400 disabled:opacity-50"
        aria-label="Save"
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </form>
  );
}

interface SortableSpaceButtonProps {
  space: Space;
  active: boolean;
  editing: boolean;
  removing: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (name: string) => Promise<void>;
}

function SortableSpaceButton({
  space,
  active,
  editing,
  removing,
  canDelete,
  onSelect,
  onEdit,
  onDelete,
  onCancelEdit,
  onSaveEdit,
}: SortableSpaceButtonProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: space.id,
    disabled: editing,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  if (editing) {
    return (
      <div ref={setNodeRef} style={style}>
        <EditSpaceRow space={space} onCancel={onCancelEdit} onSave={onSaveEdit} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center rounded-lg transition-all duration-150 ease-out ${
        isDragging ? 'opacity-40' : ''
      } ${removing ? 'pointer-events-none -translate-x-1 opacity-0' : ''} ${
        active ? 'bg-surface-hover' : 'hover:bg-surface'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none p-2 text-ink-subtle opacity-0 transition-opacity hover:text-ink-muted focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
        aria-label={`Reorder ${space.name}`}
      >
        <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        onClick={onSelect}
        className={`min-w-0 flex-1 truncate py-2 text-left text-sm transition-colors ${
          active ? 'text-ink' : 'text-ink-muted group-hover:text-ink'
        }`}
      >
        {space.name}
      </button>
      <div className="flex shrink-0 items-center gap-1 pr-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="text-ink-subtle transition-colors hover:text-ink focus-visible:outline-none"
          aria-label={`Rename ${space.name}`}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="text-xs text-ink-subtle transition-colors hover:text-red-400 focus-visible:outline-none"
            aria-label={`Delete ${space.name}`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/** Sidebar list of spaces. In edit mode: drag-and-drop reorder, inline creation, rename and delete. */
export function SpaceNav({ spaces, activeSpaceId, editMode, onSelect, onReorder, onCreate, onRename, onDelete }: Props) {
  const [creating, setCreating] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { removingIds, requestDelete } = useRemovingTransition(onDelete);

  const ids = spaces.map((s) => s.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    void onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  async function handleCreateSpace(e: React.FormEvent) {
    e.preventDefault();
    const name = newSpaceName.trim();
    if (!name) return;
    const space = await onCreate(name);
    onSelect(space.id);
    setNewSpaceName('');
    setCreating(false);
  }

  if (!editMode) {
    return (
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pt-4">
        {spaces.map((space) => (
          <ViewSpaceButton
            key={space.id}
            space={space}
            active={activeSpaceId === space.id}
            onSelect={() => onSelect(space.id)}
          />
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pt-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {spaces.map((space) => (
            <SortableSpaceButton
              key={space.id}
              space={space}
              active={activeSpaceId === space.id}
              editing={editingId === space.id}
              removing={removingIds.has(space.id)}
              canDelete={spaces.length > 1}
              onSelect={() => onSelect(space.id)}
              onEdit={() => setEditingId(space.id)}
              onDelete={() => requestDelete(space.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={async (name) => {
                await onRename(space.id, name);
                setEditingId(null);
              }}
            />
          ))}
        </SortableContext>
      </DndContext>

      {creating ? (
        <form onSubmit={handleCreateSpace} className="mt-1 flex flex-col gap-1 px-1">
          <input
            autoFocus
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            onBlur={() => {
              if (!newSpaceName.trim()) setCreating(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setNewSpaceName('');
                setCreating(false);
              }
            }}
            placeholder="Space name"
            className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-line-focus"
          />
        </form>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm text-ink-faint transition-colors hover:bg-surface hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          New space
        </button>
      )}
    </nav>
  );
}
