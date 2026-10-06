const tracks = require("../../data/learning-paths.json");
const byDocument = new Map();
for (const track of tracks)
  for (const step of track.steps) {
    if (!step.doc) continue;
    if (byDocument.has(step.doc))
      throw new Error("Duplicate route step: " + step.doc);
    byDocument.set(step.doc, step);
  }
function learningMetadata(id, frontMatter) {
  const step = byDocument.get(id);
  return step
    ? {
        ...frontMatter,
        learning_step: step.id,
        prerequisites: [
          ...new Set([
            ...(frontMatter.prerequisites || []),
            ...step.prerequisites,
          ]),
        ],
      }
    : frontMatter;
}
module.exports = { learningMetadata };
