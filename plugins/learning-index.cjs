const tracks = require('../data/learning-paths.json');
const stepIds = new Set(
  tracks.flatMap((track) => track.steps.map((step) => step.id)),
);

function collectEntries(allContent) {
  const entries = [];
  const seen = new Set();
  for (const content of Object.values(
    allContent['docusaurus-plugin-content-docs'] || {},
  )) {
    for (const version of content.loadedVersions || []) {
      for (const doc of version.docs || []) {
        const fm = doc.frontMatter || {};
        if (
          !fm.learning_step ||
          fm.draft ||
          fm.unlisted ||
          fm.status === 'planning'
        )
          continue;
        if (!stepIds.has(fm.learning_step))
          throw new Error('Unknown learning_step: ' + fm.learning_step);
        if (seen.has(fm.learning_step))
          throw new Error('Duplicate learning_step: ' + fm.learning_step);
        const date = String(fm.published_at || '');
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date
        ) {
          throw new Error('Use a valid YYYY-MM-DD published_at in ' + doc.id);
        }
        if (!Number.isFinite(fm.reading_minutes) || fm.reading_minutes <= 0)
          throw new Error('Provide positive reading_minutes in ' + doc.id);
        seen.add(fm.learning_step);
        entries.push({
          stepId: fm.learning_step,
          title: doc.title,
          description: doc.description,
          permalink: doc.permalink,
          date,
          minutes: fm.reading_minutes,
        });
      }
    }
  }
  return entries.sort(
    (a, b) => b.date.localeCompare(a.date) || a.stepId.localeCompare(b.stepId),
  );
}
module.exports = function learningIndex() {
  return {
    name: 'learning-index',
    allContentLoaded({ allContent, actions }) {
      actions.setGlobalData({ entries: collectEntries(allContent) });
    },
  };
};
module.exports.collectEntries = collectEntries;
