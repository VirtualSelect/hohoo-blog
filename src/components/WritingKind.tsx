import React from "react";
import { useText } from "@lab/components/Shell";
import { writingKinds, writingKind } from "../utils/writing-kinds.ts";

import type { ContentEntry } from "@lab/lib/site-types";
export default function WritingKind({ entry }: { entry: ContentEntry }) {
  const t = useText();
  const kind = writingKind(entry);
  const label = kind ? writingKinds[kind] : undefined;
  return label ? <span className="writing-kind">{t(...label)}</span> : null;
}
