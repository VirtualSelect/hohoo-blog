// Shared before-paint initialization for normal routes and the global 404.
export const themeScript =
  "(()=>{let t;try{t=localStorage.getItem('huhohoo.theme.v1')}catch{}document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()";
