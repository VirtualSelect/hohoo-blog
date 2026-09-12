"use client";
import { useSite } from "./context";
export function useDoc() {
  return useSite().document;
}
