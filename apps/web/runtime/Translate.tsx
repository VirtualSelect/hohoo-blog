"use client";
import { useSite } from "./context";
type Values = Readonly<Record<string, string | number>>;
type Message = { id: string; message?: string };
export function translate({ id, message }: Message, values: Values = {}) {
  const { messages } = useSite();
  return String(messages[id]?.message || message || id).replace(
    /\{(\w+)\}/g,
    (all: string, key: string) => String(values[key] ?? all),
  );
}
export default function Translate({
  id,
  children,
  values,
}: {
  id: string;
  children?: string;
  values?: Values;
}) {
  return translate({ id, message: children }, values);
}
