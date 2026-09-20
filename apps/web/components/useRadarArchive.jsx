"use client";
import { useCallback, useMemo, useRef, useState } from "react";
export default function useRadarArchive(initial, archive) {
  const [parts, setParts] = useState({});
  const [status, setStatus] = useState("idle");
  const cache = useRef(new Map());
  const requests = useRef(new Map());
  const load = useCallback(
    async (all = false) => {
      const missing = archive.chunks
        .map((url, index) => ({ url, index }))
        .filter(({ index }) => !cache.current.has(index));
      if (!missing.length) return;
      setStatus("loading");
      try {
        await Promise.all(
          (all ? missing : missing.slice(0, 1)).map(({ url, index }) => {
            if (!requests.current.has(index))
              requests.current.set(
                index,
                fetch(url)
                  .then(async (r) => {
                    if (!r.ok) throw new Error("Archive unavailable");
                    const data = await r.json();
                    if (
                      !Array.isArray(data) ||
                      data.some((i) => !i.id || !i.publishedAt)
                    )
                      throw new Error("Invalid archive");
                    cache.current.set(index, data);
                    setParts((value) => ({ ...value, [index]: data }));
                  })
                  .finally(() => requests.current.delete(index)),
              );
            return requests.current.get(index);
          }),
        );
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    },
    [archive],
  );
  const items = useMemo(
    () => [
      ...initial,
      ...Object.keys(parts)
        .sort((a, b) => Number(a) - Number(b))
        .flatMap((key) => parts[key]),
    ],
    [initial, parts],
  );
  return {
    items,
    status,
    load,
    complete: Object.keys(parts).length === archive.chunks.length,
  };
}
