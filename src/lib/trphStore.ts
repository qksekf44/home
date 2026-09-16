"use client";

import { useCallback, useEffect, useState } from "react";
import { getRawSetting, setSetting } from "./settingStore";
import { DEFAULT_TRPG_SETTINGS, type TrpgSettings } from "./galleryStore";

const TRPG_SET_KEY = "ohome.trpgset.v1";

export function useTrpgSettings(): [
  TrpgSettings,
  (patch: Partial<TrpgSettings>) => void,
  boolean,
] {
  const [st, setSt] = useState<TrpgSettings>(DEFAULT_TRPG_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = getRawSetting(TRPG_SET_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<TrpgSettings>;
        setSt({
          statuses: {
            ...DEFAULT_TRPG_SETTINGS.statuses,
            ...(p.statuses ?? {}),
          },
        });
      }
    } catch {
      /* 기본값 */
    }
    setLoaded(true);
  }, []);

  const patch = useCallback((p: Partial<TrpgSettings>) => {
    setSt((s) => {
      const n = { ...s, ...p };
      try {
        setSetting(TRPG_SET_KEY, n);
      } catch {
        /* 무시 */
      }
      return n;
    });
  }, []);

  return [st, patch, loaded];
}
