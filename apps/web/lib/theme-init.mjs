import {
  designThemes,
  designPreferenceKey,
  legacyThemePreferenceKey,
  resolveDesignPreference,
} from "./design-themes.mjs";
import {
  roamingPreferenceKey,
  createRoamingHelpers,
} from "./theme-roaming.mjs";

// The same resolver runs before paint and after client navigation. Existing
// dark/light and retired design IDs remain valid without writing a migration.
const bootstrapThemes = designThemes.map(({ id, mode }) => ({ id, mode }));
const roamingFunctions = `const {readRoamingState,localDayKey,resolveDailyDesign}=(${createRoamingHelpers.toString()})(designThemes);`;
export const themeScript = `(()=>{const designThemes=${JSON.stringify(bootstrapThemes)};const resolveDesignPreference=${resolveDesignPreference.toString()};${roamingFunctions}let d,t,r;try{d=localStorage.getItem(${JSON.stringify(designPreferenceKey)})}catch{}try{t=localStorage.getItem(${JSON.stringify(legacyThemePreferenceKey)})}catch{}try{r=localStorage.getItem(${JSON.stringify(roamingPreferenceKey)})}catch{}let p=resolveDesignPreference(d,t,matchMedia('(prefers-color-scheme: dark)').matches,designThemes);const daily=resolveDailyDesign(readRoamingState(r),p.id,localDayKey());if(daily.changed){try{if(daily.designId!==p.id){localStorage.setItem(${JSON.stringify(designPreferenceKey)},daily.designId);p=designThemes.find(theme=>theme.id===daily.designId)}localStorage.setItem(${JSON.stringify(roamingPreferenceKey)},JSON.stringify(daily.state))}catch{}}document.documentElement.dataset.design=p.id;document.documentElement.dataset.theme=p.mode})()`;
