import type { Bookmark } from '@/lib/types';
import { useRemovingTransition } from '@/lib/useRemovingTransition';
import { Favicon } from './Favicon';

export const UNTAGGED_LABEL = 'Sin categoria';

interface Props {
  bookmarks: Bookmark[];
  onDelete: (id: string) => void;
  loading?: boolean;
}

function SkeletonColumn() {
  return (
    <div className="w-52">
      <div className="mb-3 h-3 w-20 animate-pulse rounded bg-neutral-800" />
      <div className="flex flex-col gap-3">
        <div className="h-4 w-full animate-pulse rounded bg-neutral-800" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-800" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-neutral-800" />
      </div>
    </div>
  );
}

/** Agrupa por la primera tag de cada marcador (o "Sin categoria") y muestra columnas, como un tablero. */
export function BookmarkBoard({ bookmarks, onDelete, loading }: Props) {
  const { removingIds, requestDelete } = useRemovingTransition(onDelete);

  if (loading) {
    return (
      <div className="flex flex-wrap gap-10">
        <SkeletonColumn />
        <SkeletonColumn />
        <SkeletonColumn />
      </div>
    );
  }

  const groups = new Map<string, Bookmark[]>();
  for (const b of bookmarks) {
    const key = b.tags[0] ?? UNTAGGED_LABEL;
    const list = groups.get(key) ?? [];
    list.push(b);
    groups.set(key, list);
  }

  const sortedGroups = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  if (sortedGroups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-neutral-700" aria-hidden="true">
          <path
            d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5v18l-6-3.6-6 3.6v-18Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-sm text-neutral-500">Sin marcadores todavia. Añade uno con el boton de la izquierda.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-10">
      {sortedGroups.map(([group, items]) => (
        <div key={group} className="w-52">
          <h2 className="mb-3 border-b border-neutral-800 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {group}
          </h2>
          <ul className="flex flex-col gap-3">
            {items
              .slice()
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((b) => (
                <li
                  key={b.id}
                  className={`group flex items-center gap-2 transition-all duration-150 ease-out ${
                    removingIds.has(b.id) ? 'pointer-events-none -translate-x-1 opacity-0' : 'opacity-100'
                  }`}
                >
                  <Favicon url={b.url} favicon={b.favicon} className="h-4 w-4 shrink-0 rounded-sm text-neutral-500" />
                  <a
                    href={b.url}
                    className="truncate text-sm text-neutral-200 transition-colors hover:text-white"
                    title={b.title}
                  >
                    {b.title}
                  </a>
                  <button
                    onClick={() => requestDelete(b.id)}
                    className="ml-auto shrink-0 text-xs text-neutral-600 opacity-0 transition-colors hover:text-red-400 focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
                    aria-label={`Borrar ${b.title}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
