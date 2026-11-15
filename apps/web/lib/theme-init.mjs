import {
  designThemes,
  designPreferenceKey,
  legacyThemePreferenceKey,
  resolveDesignPreference,
} from "./design-themes.mjs";
import {
  roamingPreferenceKey,
  documentThemeVisitKey,
  visitThemePreferenceKey,
  createRoamingHelpers,
} from "./theme-roaming.mjs";

// Only a fresh Document advances automatic themes. Hydration and SPA navigation
// restore its record, including a choice that storage could not persist.
const bootstrapThemes = designThemes.map(({ id, mode }) => ({ id, mode }));
const roamingFunctions = `const {readRoamingState,localDayKey,resolveVisitDesign}=(${createRoamingHelpers.toString()})(designThemes);`;
export const themeScript = `(()=>{
const designThemes=${JSON.stringify(bootstrapThemes)};
const resolveDesignPreference=${resolveDesignPreference.toString()};
${roamingFunctions}
const visitKey=${JSON.stringify(documentThemeVisitKey)};
const existing=document[visitKey];
const restored=existing&&designThemes.find(theme=>theme.id===existing.designId);
if(restored){document.documentElement.dataset.design=restored.id;document.documentElement.dataset.theme=restored.mode;return}
let d,t,r,lastVisit;
try{d=localStorage.getItem(${JSON.stringify(designPreferenceKey)})}catch{}
try{t=localStorage.getItem(${JSON.stringify(legacyThemePreferenceKey)})}catch{}
try{r=localStorage.getItem(${JSON.stringify(roamingPreferenceKey)})}catch{}
try{const tabId=sessionStorage.getItem(${JSON.stringify(visitThemePreferenceKey)});if(designThemes.some(theme=>theme.id===tabId))lastVisit=tabId}catch{}
const previous=resolveDesignPreference(d,t,matchMedia('(prefers-color-scheme: dark)').matches,designThemes);
const state=readRoamingState(r);
const hasPrevious=designThemes.some(theme=>theme.id===d)||d==='journal'||d==='gallery'||t==='dark'||t==='light';
const currentId=state.mode==='visit'&&!hasPrevious?null:previous.id;
const visit=resolveVisitDesign(state,currentId,localDayKey(),Math.random,lastVisit);
const p=designThemes.find(theme=>theme.id===visit.designId)||previous;
let unsaved=false;
if(visit.changed){try{
localStorage.setItem(${JSON.stringify(roamingPreferenceKey)},JSON.stringify(visit.state));
localStorage.setItem(${JSON.stringify(designPreferenceKey)},p.id);
}catch{unsaved=true}}
document[visitKey]={designId:p.id,state:visit.state,unsaved};
try{sessionStorage.setItem(${JSON.stringify(visitThemePreferenceKey)},p.id)}catch{}
document.documentElement.dataset.design=p.id;
document.documentElement.dataset.theme=p.mode;
})()`;
