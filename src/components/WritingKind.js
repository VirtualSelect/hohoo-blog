import React from "react";
import { useText } from "@lab/components/Shell";
import { writingKinds, writingKind } from "../utils/writing-kinds.cjs";

export default function WritingKind({ entry }) {
  const t = useText();
  const label = writingKinds[writingKind(entry)];
  return label ? <span className="writing-kind">{t(...label)}</span> : null;
}
