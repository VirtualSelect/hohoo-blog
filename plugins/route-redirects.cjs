const fs = require('node:fs/promises');
const path = require('node:path');
const redirects = {
  '/aboutMe': '/about',
  '/blog/a new milestone': '/blog/a-new-milestone',
  '/news': '/radar',
  '/news/weekly': '/radar/weekly',
  '/lab': '/labs',
};
module.exports = function (context) {
  return {
    name: 'route-redirects',
    async postBuild({ outDir }) {
      const prefix =
        context.i18n.currentLocale === context.i18n.defaultLocale
          ? ''
          : '/' + context.i18n.currentLocale;
      for (const [from, to] of Object.entries(redirects)) {
        const target = prefix + to;
        const canonical = context.siteConfig.url.replace(/\/$/, '') + target;
        const directory = path.join(outDir, from.slice(1));
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(
          path.join(directory, 'index.html'),
          '<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="canonical" href="' +
            canonical +
            '"><meta http-equiv="refresh" content="0;url=' +
            target +
            '"><title>Moved</title></head><body><a href="' +
            target +
            '">Continue →</a><script>location.replace(' +
            JSON.stringify(target) +
            '+location.search+location.hash)</script></body></html>',
        );
      }
    },
  };
};
module.exports.redirects = redirects;
