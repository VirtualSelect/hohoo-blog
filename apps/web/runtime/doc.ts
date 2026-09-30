"use client";
import { useSite } from "./context";
export function useDoc() {
  const document = useSite().document;
  if (!document) throw new Error("useDoc requires a document route");
  return document;
}
