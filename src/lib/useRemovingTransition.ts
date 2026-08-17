import { useCallback, useRef, useState } from 'react';

/**
 * Deja que un item se anime (fade/slide out) antes de llamar al onDelete real,
 * en vez de que desaparezca de golpe en cuanto se quita del array de estado.
 */
export function useRemovingTransition(onDelete: (id: string) => void, durationMs = 150) {
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const requestDelete = useCallback(
    (id: string) => {
      setRemovingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        onDeleteRef.current(id);
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, durationMs);
    },
    [durationMs],
  );

  return { removingIds, requestDelete };
}
