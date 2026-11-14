import { designThemes } from "./design-themes.mjs";

export const roamingPreferenceKey = "huhohoo.roaming.v1";

// This factory is deliberately self-contained: the same functions run in the
// bundled client and in a serialized before-paint script with an inline registry.
export function createRoamingHelpers(registry) {
  function validRoamingDay(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return false;
    const date = new Date(value + "T00:00:00Z");
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }

  function readRoamingState(raw, themes = registry) {
    const empty = {
      version: 1,
      daily: false,
      visited: [],
      previousId: null,
      day: null,
      dailyId: null,
    };
    if (typeof raw !== "string" || raw.length > 4096) return empty;
    try {
      const value = JSON.parse(raw);
      if (!value || Array.isArray(value) || value.version !== 1) return empty;
      const supported = (id) => themes.some((theme) => theme.id === id);
      const daily =
        value.daily === true &&
        validRoamingDay(value.day) &&
        supported(value.dailyId);
      return {
        version: 1,
        daily,
        visited: Array.isArray(value.visited)
          ? [...new Set(value.visited.filter(supported))]
          : [],
        previousId: supported(value.previousId) ? value.previousId : null,
        day: daily ? value.day : null,
        dailyId: daily ? value.dailyId : null,
      };
    } catch {
      return empty;
    }
  }

  function localDayKey(date = new Date()) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime()))
      return null;
    return [
      String(date.getFullYear()).padStart(4, "0"),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function chooseRoamingTheme(
    currentId,
    visited,
    random = Math.random,
    themes = registry,
  ) {
    const others = themes.filter((theme) => theme.id !== currentId);
    const seen = new Set(Array.isArray(visited) ? visited : []);
    const unseen = others.filter((theme) => !seen.has(theme.id));
    const candidates = unseen.length ? unseen : others;
    if (!candidates.length) return currentId;
    const value = random();
    const sample = Number.isFinite(value)
      ? Math.min(0.999999, Math.max(0, value))
      : 0;
    return candidates[Math.floor(sample * candidates.length)].id;
  }

  function recordDesignVisit(
    state,
    nextId,
    currentId,
    { daily = false, day = null } = {},
  ) {
    const clean = readRoamingState(JSON.stringify(state));
    const supported = (id) => registry.some((theme) => theme.id === id);
    if (!supported(nextId)) return clean;
    const previousId =
      supported(currentId) && currentId !== nextId
        ? currentId
        : clean.previousId === nextId
          ? null
          : clean.previousId;
    const dailyEnabled = daily === true && validRoamingDay(day);
    return {
      version: 1,
      daily: dailyEnabled,
      visited: [
        ...new Set([...clean.visited, currentId, nextId].filter(supported)),
      ],
      previousId,
      day: dailyEnabled ? day : null,
      dailyId: dailyEnabled ? nextId : null,
    };
  }

  // Only the synchronous document bootstrap advances the day. Client navigation
  // restores the saved choice; no timer changes a page while someone is reading.
  function resolveDailyDesign(state, currentId, day) {
    const clean = readRoamingState(JSON.stringify(state));
    if (!clean.daily)
      return { designId: currentId, state: clean, changed: false };
    // An explicit theme write may have succeeded while its roaming write failed.
    // Never let the older daily record undo that newer explicit preference.
    if (clean.dailyId !== currentId)
      return {
        designId: currentId,
        state: recordDesignVisit(clean, currentId, clean.dailyId),
        changed: true,
      };
    if (!validRoamingDay(day) || clean.day === day)
      return { designId: currentId, state: clean, changed: false };
    // Equal starting records select the same next view in concurrent fresh tabs.
    let seed = 2166136261;
    for (const character of day)
      seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
    const designId = chooseRoamingTheme(
      currentId,
      clean.visited,
      () => seed / 4294967296,
    );
    return {
      designId,
      state: recordDesignVisit(clean, designId, currentId, {
        daily: true,
        day,
      }),
      changed: true,
    };
  }
  return {
    validRoamingDay,
    readRoamingState,
    localDayKey,
    chooseRoamingTheme,
    recordDesignVisit,
    resolveDailyDesign,
  };
}

export const {
  validRoamingDay,
  readRoamingState,
  localDayKey,
  chooseRoamingTheme,
  recordDesignVisit,
  resolveDailyDesign,
} = createRoamingHelpers(designThemes);
