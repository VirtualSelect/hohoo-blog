"use client";
import { useSite } from "./context";
export function translate({ id, message }, values = {}) {
  const { messages } = useSite();
  return String(messages[id]?.message || message || id).replace(
    /\{(\w+)\}/g,
    (all, key) => values[key] ?? all,
  );
}
export default function Translate({ id, children, values }) {
  return translate({ id, message: children }, values);
}
