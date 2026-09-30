"use client";
import dynamic from "next/dynamic";
import type { PropsWithChildren } from "react";
const Document = dynamic(() => import("./Document"));
const Views = dynamic(() => import("./Views"));

// Keep SSR content while separating independent page families into route chunks.
export default function RouteContent({
  kind,
  children,
}: PropsWithChildren<{ kind: "document" | "views" }>) {
  if (kind === "document") return <Document>{children}</Document>;
  return <Views />;
}
