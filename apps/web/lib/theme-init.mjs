import {
  designThemes,
  designPreferenceKey,
  legacyThemePreferenceKey,
  resolveDesignPreference,
} from "./design-themes.mjs";

// The same resolver runs before paint and after client navigation. Existing
// dark/light and retired design IDs remain valid without writing a migration.
const bootstrapThemes = designThemes.map(({ id, mode }) => ({ id, mode }));
export const themeScript = `(()=>{const designThemes=${JSON.stringify(bootstrapThemes)};const resolveDesignPreference=${resolveDesignPreference.toString()};let d,t;try{d=localStorage.getItem(${JSON.stringify(designPreferenceKey)});t=localStorage.getItem(${JSON.stringify(legacyThemePreferenceKey)})}catch{}const p=resolveDesignPreference(d,t,matchMedia('(prefers-color-scheme: dark)').matches,designThemes);document.documentElement.dataset.design=p.id;document.documentElement.dataset.theme=p.mode})()`;
