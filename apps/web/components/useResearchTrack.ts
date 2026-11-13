"use client";
import { useCallback, useEffect, useState } from "react";
import tracks from "@site/data/learning-paths.json";
import { readResearchTrack, researchTrackUrl } from "../lib/reading-paths.mjs";
import type { Domain } from "../lib/site-types";

export default function useResearchTrack(
  fallback: Domain | "all" = "ai-apps",
  allowAll = false,
) {
  const [domain, setDomain] = useState<Domain | "all">(fallback);
  const sync = useCallback(
    () =>
      setDomain(
        readResearchTrack(
          location.search,
          location.hash,
          tracks,
          fallback,
          allowAll,
        ) as Domain | "all",
      ),
    [fallback, allowAll],
  );
  useEffect(() => {
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [sync]);
  return [
    domain,
    (value: Domain | "all") => {
      if (value === domain) return;
      setDomain(value);
      const url = researchTrackUrl(location.href, value);
      history.pushState(null, "", url);
    },
    sync,
  ] as const;
}
