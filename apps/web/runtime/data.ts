"use client";
import { useSite } from "./context";
import type { GlobalData } from "../lib/site-types";
export function useContentData<K extends keyof GlobalData>(
  name: K,
): GlobalData[K] {
  return useSite().globalData[name];
}
