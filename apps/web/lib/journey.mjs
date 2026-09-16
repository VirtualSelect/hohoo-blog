export const journeyStatuses = [
  "not-started",
  "learning",
  "building",
  "completed",
];

/**
 * @typedef {{id: string, name: string}} SimulationEngine
 * @typedef {Object} SimulationLab
 * @property {string} id Stable relation ID, independent of translated titles.
 * @property {string} slug Anchor on /journey/virtual-lab.
 * @property {string} engine SimulationEngine.id.
 * @property {"planning"|"learning"|"completed"|"future"} status
 * @property {string} titleKey
 * @property {string} descriptionKey
 * @property {string} robotKey
 * @property {string} environmentKey
 * @property {string[]} milestones Journey milestone IDs.
 * @property {string[]} skills
 * @property {string[]} topics
 * @property {string[]} steps Translation keys for the planned experiment flow.
 * @property {string} project
 * @property {{href: string, titleKey: string}[]} evidence
 * @property {{href: string, titleKey: string}[]} articles
 * @property {{href: string, titleKey: string}[]} demos
 * @property {{href: string, titleKey: string}[]} github
 * @property {string|null} result Translation key; null until actually executed.
 * @property {string|null} startedAt
 * @property {string|null} completedAt
 */

export function validateVirtualLabs(registry, journey) {
  const fail = (message) => {
    throw new Error(`Virtual lab: ${message}`);
  };
  if (registry.version !== 1) fail("unsupported schema");
  const engines = new Set(registry.engines.map((e) => e.id));
  const ids = new Set(registry.labs.map((lab) => lab.id));
  if (
    ids.size !== registry.labs.length ||
    engines.size !== registry.engines.length
  )
    fail("duplicate ID");
  if (new Set(registry.labs.map((lab) => lab.slug)).size !== ids.size)
    fail("duplicate slug");
  if (new Set(registry.labs.map((lab) => lab.order)).size !== ids.size)
    fail("duplicate order");
  const milestones = new Set(journey.milestones.map((m) => m.id));
  const validLink = (ref) =>
    ref.titleKey &&
    (/^https:\/\/[^\s]+$/.test(ref.href) || /^\/(?!\/)[^\s]*$/.test(ref.href));
  for (const lab of registry.labs) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lab.slug)) fail("invalid slug");
    if (!engines.has(lab.engine)) fail("unknown engine");
    if (lab.project !== journey.targetProject.name) fail("unknown project");
    if (
      !lab.milestones.length ||
      lab.milestones.some((id) => !milestones.has(id))
    )
      fail("unknown milestone");
    if (!["planning", "learning", "completed", "future"].includes(lab.status))
      fail("invalid status");
    if (
      ![
        lab.titleKey,
        lab.descriptionKey,
        lab.robotKey,
        lab.environmentKey,
      ].every((key) => typeof key === "string" && key.startsWith("journey."))
    )
      fail("missing translation key");
    for (const date of [lab.startedAt, lab.completedAt])
      if (
        date !== null &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date)
      )
        fail("invalid date");
    if (
      ["planning", "future"].includes(lab.status) &&
      (lab.result ||
        lab.startedAt ||
        lab.completedAt ||
        lab.evidence.length ||
        lab.demos.length ||
        lab.github.length)
    )
      fail("unexecuted lab cannot claim results");
    if (
      lab.status === "completed" &&
      (!lab.result ||
        !lab.startedAt ||
        !lab.completedAt ||
        !lab.evidence.length)
    )
      fail("completion requires evidence and dates");
    if (lab.completedAt && (!lab.startedAt || lab.completedAt < lab.startedAt))
      fail("invalid date order");
    if (
      [...lab.articles, ...lab.demos, ...lab.github, ...lab.evidence].some(
        (ref) => !validLink(ref),
      )
    )
      fail("unsafe reference");
  }
  const relations = [
    journey.recommendedLab,
    ...(journey.currentLab ? [journey.currentLab] : []),
    ...journey.simulation.labOrder,
    ...journey.weeks.flatMap((week) => week.labs),
  ];
  if (relations.some((id) => !ids.has(id))) fail("unknown lab relation");
  if (
    journey.currentWeek !== null &&
    (!Number.isInteger(journey.currentWeek) ||
      journey.currentWeek < 1 ||
      journey.currentWeek > journey.weeks.length)
  )
    fail("invalid current week");
  return registry;
}

// Author-maintained progress is separate from a visitor's reading history.
export function validateJourney(data) {
  const fail = (message) => {
    throw new Error(`Journey: ${message}`);
  };
  if (data.version !== 1) fail("unsupported schema version");
  if (
    data.targetProject.repository &&
    !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(
      data.targetProject.repository,
    )
  )
    fail("invalid repository URL");
  const tracks = new Set(data.tracks.map((track) => track.id));
  if (
    tracks.size !== 3 ||
    data.tracks.reduce((sum, t) => sum + t.plannedWeight, 0) !== 100
  )
    fail("three tracks and a 100% planned allocation are required");
  const ids = new Set(data.milestones.map((m) => m.id));
  if (!ids.has(data.currentMilestone)) fail("unknown current milestone");
  if (ids.size !== data.milestones.length) fail("duplicate milestone id");
  const visited = new Set(),
    active = new Set();
  function visit(id) {
    if (!ids.has(id)) fail(`unknown prerequisite ${id}`);
    if (active.has(id)) fail("cyclic prerequisites");
    if (visited.has(id)) return;
    active.add(id);
    const m = data.milestones.find((item) => item.id === id);
    if (!journeyStatuses.includes(m.status)) fail(`invalid status ${id}`);
    if (!m.tracks.length || m.tracks.some((t) => !tracks.has(t)))
      fail(`unknown track ${id}`);
    for (const date of [m.startedAt, m.completedAt])
      if (
        date !== null &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          new Date(date).toISOString().slice(0, 10) !== date)
      )
        fail(`invalid date ${id}`);
    if (
      m.status === "not-started" &&
      (m.startedAt || m.completedAt || m.result)
    )
      fail(`unstarted milestone has outcomes ${id}`);
    if (
      m.status === "completed" &&
      (!m.completedAt || !m.result || !m.evidence.length)
    )
      fail(`completion needs evidence ${id}`);
    if (m.completedAt && (!m.startedAt || m.completedAt < m.startedAt))
      fail(`invalid date order ${id}`);
    for (const dep of m.prerequisites) visit(dep);
    active.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
  for (const track of data.tracks)
    if (track.milestones.some((id) => !ids.has(id)))
      fail("unknown track milestone");
  for (const m of data.milestones) {
    if (m.next.some((id) => !ids.has(id))) fail("unknown next milestone");
    for (const e of m.evidence)
      if (!e.title || !/^https:\/\//.test(e.href))
        fail("evidence requires a title and HTTPS URL");
  }
  for (const week of data.weeks)
    if (week.milestones.some((id) => !ids.has(id)))
      fail("unknown schedule milestone");
  return data;
}
