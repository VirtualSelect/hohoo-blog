"use client";
import dynamic from "next/dynamic";
const Document = dynamic(() => import("./Document"));
const Views = dynamic(() => import("./Views"));

// Keep SSR content while separating independent page families into route chunks.
export default function RouteContent({ kind, children }) {
  if (kind === "document") return <Document>{children}</Document>;
  return <Views />;
}
