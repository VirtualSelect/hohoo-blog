const { check, resolveManifest } = require('../scripts/i18n/check.cjs');
module.exports = function () {
  return {
    name: 'translation-check',
    loadContent() {
      for (const warning of check()) console.warn('[i18n] ' + warning);
      return resolveManifest();
    },
    async contentLoaded({ content, actions }) {
      await actions.createData('manifest.json', JSON.stringify(content));
    },
  };
};
