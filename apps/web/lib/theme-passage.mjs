// Short, decorative passages accompany a deliberate change, never its content.
// Only constant SVG markup is inserted; the requested theme is allow-listed.
const passageArtwork = {
  space: `<g class="theme-passage-orbits" fill="none"><ellipse cx="600" cy="400" rx="390" ry="140"/><ellipse cx="600" cy="400" rx="390" ry="140" transform="rotate(58 600 400)"/><circle cx="600" cy="400" r="220"/></g><g class="theme-passage-stars"><circle cx="226" cy="360" r="5"/><circle cx="788" cy="555" r="4"/><circle cx="814" cy="205" r="3"/></g>`,
  clear: `<g class="theme-passage-lines" fill="none"><path d="M360 240h480M360 318h360M360 352h440M360 386h400M360 464h480M360 498h330"/><path class="theme-passage-margin" d="M310 220v310"/></g>`,
  classic: `<g class="theme-passage-ink" fill="none"><path d="M140 346c220-10 446 14 920-5"/><path d="M140 375c270 5 496-7 780-2"/><path d="M140 458h96"/></g>`,
  garden: `<g class="theme-passage-leaves"><path d="M1060 140C830 70 724 205 738 378c158-4 294-69 322-238Z"/><path d="M1238 352c-237-91-341 25-349 207 174 2 310-56 349-207Z"/><path d="M900-45C685-60 615 67 659 200 810 167 889 92 900-45Z"/><path class="theme-passage-veins" d="M738 378 972 188M889 559 1147 392M659 200 830 10"/></g>`,
  photo: `<g class="theme-passage-aperture" fill="none"><circle cx="600" cy="400" r="220"/><circle class="theme-passage-aperture-edge" cx="600" cy="400" r="150"/></g>`,
  construct: `<g class="theme-passage-blocks"><path d="M760 130h140v250H760Z"/><path d="M300 430h310v100H300Z"/><path class="theme-passage-quarter" d="M900 430v140H760a140 140 0 0 1 140-140Z"/></g>`,
  map: `<g class="theme-passage-routes" fill="none"><path pathLength="1" d="M165 530 390 270l250 180 360-220"/><path pathLength="1" d="m390 270 180-110m70 290 150 185"/></g><g class="theme-passage-nodes"><circle cx="165" cy="530" r="7"/><circle cx="390" cy="270" r="9"/><circle cx="640" cy="450" r="9"/><circle cx="1000" cy="230" r="7"/><circle cx="570" cy="160" r="5"/><circle cx="790" cy="635" r="5"/></g>`,
  chapters: `<g class="theme-passage-page"><path class="theme-passage-paper" d="M600 130c174-20 340-12 490 26v500c-166-34-324-39-490-12Z"/><path class="theme-passage-page-lines" d="M660 248c110-8 224-2 350 16M660 288c110-8 224-2 350 16M660 328c110-8 224-2 350 16M660 424c110-8 224-2 350 16M660 464c110-8 224-2 350 16"/><path class="theme-passage-spine" d="M600 130v514"/></g>`,
};

let activePassage = null;
const noPassage = () => {};

/** Apply synchronously and return an idempotent cleanup for navigation/unmount. */
export function runThemePassage(themeId, applyChange) {
  activePassage?.();
  applyChange();

  if (
    typeof document === "undefined" ||
    typeof window === "undefined" ||
    !document.body ||
    document.hidden ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    !Object.hasOwn(passageArtwork, themeId)
  )
    return noPassage;

  const layer = document.createElement("div");
  layer.className = "theme-passage";
  layer.dataset.passage = themeId;
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = `<svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" focusable="false" aria-hidden="true">${passageArtwork[themeId]}</svg>`;

  let timeout;
  let disposed = false;
  const cancel = () => {
    if (disposed) return;
    disposed = true;
    window.clearTimeout(timeout);
    layer.removeEventListener("animationend", onEnd);
    document.removeEventListener("visibilitychange", onVisibility);
    layer.remove();
    if (activePassage === cancel) activePassage = null;
  };
  const onEnd = (event) => {
    if (event.target === layer) cancel();
  };
  const onVisibility = () => {
    if (document.hidden) cancel();
  };
  layer.addEventListener("animationend", onEnd);
  document.addEventListener("visibilitychange", onVisibility);
  activePassage = cancel;
  document.body.append(layer);
  // Animation events may be suppressed when CSS is unavailable or a tab sleeps.
  timeout = window.setTimeout(cancel, 420);
  return cancel;
}
