"use client";
import { useSite } from "./context";
export function useContentData(name) {
  return useSite().globalData[name];
}
