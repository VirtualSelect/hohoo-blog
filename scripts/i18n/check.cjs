const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const manifest = require('../../data/localization.json');
const root = path.resolve(__dirname, '../..');
function revision(file) {
  try {
    return crypto
      .createHash('sha256')
      .update(
        fs
          .readFileSync(path.resolve(root, file), 'utf8')
          .replace(/\r\n/g, '\n'),
      )
      .digest('hex');
  } catch {
    return null;
  }
}
function resolveManifest(input = manifest) {
  return Object.fromEntries(
    Object.entries(input).map(([id, m]) => [
      id,
      {
        ...m,
        sourceRevision: revision(m.file) || m.sourceRevision,
        translations: Object.fromEntries(
          Object.entries(m.translations || {}).map(([locale, t]) => [
            locale,
            {
              ...t,
              status:
                revision(t.file) === null
                  ? 'MISSING'
                  : revision(t.file) !== t.translationRevision
                    ? 'OUTDATED'
                    : t.status,
            },
          ]),
        ),
      },
    ]),
  );
}
function check() {
  const warnings = [];
  for (const [id, m] of Object.entries(manifest)) {
    if (revision(m.file) !== m.sourceRevision)
      warnings.push(
        id + ': source revision changed or missing; translations need review.',
      );
    for (const [locale, t] of Object.entries(m.translations || {}))
      if (
        revision(t.file) !== t.translationRevision ||
        t.sourceRevision !== revision(m.file)
      )
        warnings.push(id + ' ' + locale + ': translation needs review.');
  }
  return warnings;
}
if (require.main === module) {
  for (const warning of check()) console.warn(warning);
  console.log('Translation audit complete (advisory).');
}
module.exports = { check, revision, resolveManifest };
