import { useEffect, useRef, useState } from 'react';
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

const POPULAR_EMOJIS = [
  '📁', '💻', '🚀', '👥', '💼', '📚', '🎨', '💡',
  '🌐', '🛠️', '🎮', '🎬', '🎧', '🛒', '✈️', '🍔',
  '🏠', '📝', '📦', '⭐', '✨', '🔥', '📈', '🔒',
  '📊', '⚡', '🎯', '🧠', '💬', '🧪', '📌', '☕',
  '🎵', '💰', '🔑', '🏷️',
];

export function parseSpaceName(rawName: string): { emoji: string; name: string } {
  const trimmed = rawName.trim();
  const match = trimmed.match(/^(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*|\p{Emoji_Presentation})\s*(.*)$/u);
  if (match && match[1]) {
    return {
      emoji: match[1],
      name: match[2]?.trim() ?? '',
    };
  }
  return {
    emoji: '📁',
    name: trimmed,
  };
}

interface EmojiPickerProps {
  emoji: string;
  onChange: (emoji: string) => void;
}

function EmojiPickerButton({ emoji, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-hover/80 text-sm transition-transform hover:bg-surface-hover active:scale-95"
        title="Choose emoji"
        aria-label="Choose emoji"
      >
        {emoji || '📁'}
      </button>

      {open && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute -left-1.5 top-full z-50 mt-1 flex w-[184px] flex-col gap-1.5 rounded-lg border border-line bg-surface p-2 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-line pb-1.5">
            <span className="text-[11px] font-medium text-ink-muted">Choose emoji</span>
            <input
              type="text"
              autoFocus
              placeholder="Paste..."
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val) {
                  const chars = Array.from(val);
                  onChange(chars.slice(-1)[0] || chars.slice(-2).join('') || '📁');
                  setOpen(false);
                }
              }}
              className="w-20 rounded border border-line bg-canvas px-1 py-0.5 text-center text-xs text-ink outline-none focus:border-line-focus"
            />
          </div>

          <div className="grid max-h-36 grid-cols-6 gap-1 overflow-x-hidden overflow-y-auto pr-0.5 [scrollbar-width:thin]">
            {POPULAR_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => {
                  onChange(em);
                  setOpen(false);
                }}
                className={`flex h-6 w-6 items-center justify-center rounded text-sm transition-transform hover:scale-110 hover:bg-surface-hover ${
                  emoji === em ? 'bg-surface-hover ring-1 ring-line-focus' : ''
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ViewSpaceButton({ space, active, onSelect }: { space: Space; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active ? 'bg-surface-hover text-ink font-medium' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
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
  const parsed = parseSpaceName(space.name);
  const [emoji, setEmoji] = useState(parsed.emoji);
  const [name, setName] = useState(parsed.name);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);

  const commitSave = async () => {
    if (isSavingRef.current) return;
    const trimmed = name.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    isSavingRef.current = true;
    setSaving(true);
    try {
      const finalEmoji = emoji.trim() || '📁';
      await onSave(`${finalEmoji} ${trimmed}`);
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  };

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        void commitSave();
      }
    }
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [name, emoji]);

  function handleNameChange(val: string) {
    const p = parseSpaceName(val);
    if (p.name && p.emoji !== '📁') {
      setEmoji(p.emoji);
      setName(p.name);
    } else {
      setName(val);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await commitSave();
  }

  return (
    <div ref={containerRef}>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-surface py-1 pl-1.5 pr-1"
      >
        <EmojiPickerButton emoji={emoji} onChange={setEmoji} />
        <input
          autoFocus
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Space name"
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
          disabled={saving || !name.trim()}
          className="shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-hover hover:text-emerald-400 disabled:opacity-50"
          aria-label="Save"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}

interface CreateSpaceRowProps {
  onCancel: () => void;
  onSave: (fullName: string) => Promise<void>;
}

function CreateSpaceRow({ onCancel, onSave }: CreateSpaceRowProps) {
  const [emoji, setEmoji] = useState('📁');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);

  const commitSave = async () => {
    if (isSavingRef.current) return;
    const trimmed = name.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    isSavingRef.current = true;
    setSaving(true);
    try {
      const finalEmoji = emoji.trim() || '📁';
      await onSave(`${finalEmoji} ${trimmed}`);
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  };

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        void commitSave();
      }
    }
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [name, emoji]);

  function handleNameChange(val: string) {
    const p = parseSpaceName(val);
    if (p.name && p.emoji !== '📁') {
      setEmoji(p.emoji);
      setName(p.name);
    } else {
      setName(val);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await commitSave();
  }

  return (
    <div ref={containerRef} className="mt-1">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1.5 rounded-lg border border-line bg-surface py-1 pl-1.5 pr-1"
      >
        <EmojiPickerButton emoji={emoji} onChange={setEmoji} />
        <input
          autoFocus
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Space name"
          className="w-full min-w-0 bg-transparent text-sm text-ink placeholder-ink-faint outline-none"
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
          disabled={saving || !name.trim()}
          className="shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-hover hover:text-emerald-400 disabled:opacity-50"
          aria-label="Create space"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </form>
    </div>
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
  const style = { transform: CSS.Translate.toString(transform), transition };

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
      className={`group flex items-center rounded-lg transition-colors ${
        isDragging ? 'opacity-25' : ''
      } ${removing ? 'pointer-events-none -translate-x-1 opacity-0 transition-all duration-150 ease-out' : ''} ${
        active ? 'bg-surface-hover' : 'hover:bg-surface-hover'
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { removingIds, requestDelete } = useRemovingTransition(onDelete);

  const ids = spaces.map((s) => s.id);
  const activeSpace = activeId ? spaces.find((s) => s.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    void onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  async function handleCreateSave(fullName: string) {
    setCreating(false);
    const space = await onCreate(fullName);
    onSelect(space.id);
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
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
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeSpace ? (
            <div className="flex select-none items-center rounded-lg bg-surface-hover shadow-lg ring-1 ring-line/50">
              <div className="shrink-0 p-2 text-ink-muted">
                <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <span className="min-w-0 flex-1 truncate py-2 text-left text-sm font-medium text-ink">
                {activeSpace.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {creating ? (
        <CreateSpaceRow
          onCancel={() => setCreating(false)}
          onSave={handleCreateSave}
        />
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          New space
        </button>
      )}
    </nav>
  );
}
