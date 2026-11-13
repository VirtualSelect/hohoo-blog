"use client";
import { Suspense, useCallback, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function Observer({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const previous = useRef<{ url: string; callback: () => void } | null>(null);
  const sync = useCallback(() => {
    const url = location.pathname + location.search + location.hash;
    if (previous.current?.url === url && previous.current.callback === onChange)
      return;
    previous.current = { url, callback: onChange };
    onChange();
  }, [onChange]);
  useEffect(sync, [pathname, search, sync]);
  useEffect(() => {
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [sync]);
  return null;
}

// Only the query observer suspends; the surrounding reading page stays static.
export default function UrlStateSync({ onChange }: { onChange: () => void }) {
  return (
    <Suspense fallback={null}>
      <Observer onChange={onChange} />
    </Suspense>
  );
}
