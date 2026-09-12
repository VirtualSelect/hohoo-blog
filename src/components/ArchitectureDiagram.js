import React from 'react';
export default function ArchitectureDiagram({ steps, caption }) {
  if (!steps?.length) return null;
  return (
    <figure className="hh-architecture">
      <figcaption className="hh-eyebrow">
        {caption || 'SYSTEM ARCHITECTURE'}
      </figcaption>
      <ol>
        {steps.map((step, i) => (
          <li key={step}>
            <span className="hh-meta">{String(i + 1).padStart(2, '0')}</span>
            <strong>{step}</strong>
            {i < steps.length - 1 && <span aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>
    </figure>
  );
}
