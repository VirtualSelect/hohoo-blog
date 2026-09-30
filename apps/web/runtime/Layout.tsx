import type { PropsWithChildren } from "react";
// Metadata is emitted by the server route; keep legacy page props compatible.
export default function Layout({
  children,
}: PropsWithChildren<{ title?: string; description?: string }>) {
  return children;
}
