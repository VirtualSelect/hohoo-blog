import { uiLabel } from '@site/src/utils/ui-labels';
import React from 'react';
const labels = {
  author: 'AUTHOR / HOOHOO',
  'ai-summary': 'AI SUMMARY',
  'source-excerpt': 'SOURCE EXCERPT',
  'paper-abstract': 'PAPER ABSTRACT',
  'auto-translation': 'AUTO TRANSLATION',
  'experiment-result': 'EXPERIMENT RESULT',
};
export default function ContentProvenance({ kind }) {
  return labels[kind] ? (
    <p className="hh-eyebrow hh-provenance">{uiLabel(labels[kind])}</p>
  ) : null;
}
export function Freshness({ entry }) {
  const states = {
    current: 'CURRENT',
    'may-be-outdated': 'MAY BE OUTDATED',
    historical: 'HISTORICAL',
  };
  return (
    <div className="hh-meta hh-freshness">
      {entry.lastVerified && (
        <span>
          {uiLabel('LAST VERIFIED')}{' '}
          <time dateTime={entry.lastVerified}>
            {entry.lastVerified.slice(0, 10)}
          </time>
        </span>
      )}
      {states[entry.contentStatus] && (
        <span>{uiLabel(states[entry.contentStatus])}</span>
      )}
    </div>
  );
}
