import { useCallback, useEffect, useState } from 'react';

import {
  readOpenedAt,
  stampMs,
  writeOpenedAt,
  type OpenedAtByThread,
} from '@/team-inbox/utils/teamInboxReadState';

/**
 * The per-viewer record of what has been read, held in this browser and nowhere else.
 *
 * `markRead` only ever moves a thread's stamp forward, which is what keeps the page still: opening
 * a thread marks it, re-rendering does not mark it again, and the same object comes back so nothing
 * downstream recomputes. If storage is unavailable this behaves exactly the same for the length of
 * the session — the state lives in React either way — and simply starts empty on the next visit.
 */
export const useTeamInboxReadState = () => {
  const [openedAt, setOpenedAt] = useState<OpenedAtByThread>(readOpenedAt);

  useEffect(() => {
    writeOpenedAt(openedAt);
  }, [openedAt]);

  const markRead = useCallback(
    (code: string | undefined, readThrough: string | undefined) => {
      if (!code) return;

      const at =
        stampMs(readThrough) > 0
          ? new Date(stampMs(readThrough)).toISOString()
          : new Date().toISOString();

      setOpenedAt((previous) =>
        stampMs(previous[code]) >= stampMs(at)
          ? previous
          : { ...previous, [code]: at },
      );
    },
    [],
  );

  return { openedAt, markRead };
};
