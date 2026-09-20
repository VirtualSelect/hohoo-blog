import { uiLabel } from "@site/src/utils/ui-labels";
import React from "react";
import ExpandableFigure from "@lab/components/ExpandableFigure";
export default function ArchitectureDiagram({ steps, caption }) {
  if (!steps?.length) return null;
  return (
    <ExpandableFigure title={caption || uiLabel("ARCHITECTURE")}>
      <div className="hh-architecture">
        <ol>
          {steps.map((step, i) => (
            <li key={step}>
              <span className="hh-meta">{String(i + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
              {i < steps.length - 1 && <span aria-hidden="true">→</span>}
            </li>
          ))}
        </ol>
      </div>
    </ExpandableFigure>
  );
}
