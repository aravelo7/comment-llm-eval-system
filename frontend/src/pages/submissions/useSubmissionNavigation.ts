import { useMemo } from 'react';

import type { SubmissionItem } from '../../types/submission';

export function useSubmissionNavigation(
  items: SubmissionItem[],
  currentId: string | null,
) {
  const navigation = useMemo(() => {
    const currentIndex = currentId
      ? items.findIndex((item) => item.id === currentId)
      : -1;

    return {
      currentIndex,
      previousItem: currentIndex > 0 ? items[currentIndex - 1] : null,
      nextItem:
        currentIndex >= 0 && currentIndex < items.length - 1
          ? items[currentIndex + 1]
          : null,
    };
  }, [currentId, items]);

  return navigation;
}
