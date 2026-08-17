import { useCallback, useRef, useState } from 'react';

/**
 * Lets an item animate out (fade/slide) before calling the real onDelete,
 * instead of it vanishing instantly as soon as it's removed from the state array.
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
