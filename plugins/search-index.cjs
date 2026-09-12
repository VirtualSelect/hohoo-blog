const { collectContent } = require('./content-index.cjs');
const { signals } = require('../src/utils/radar.cjs');
const news = require('../data/news/items.json');
const config = require('../config/news-sources.json');
module.exports = function (context) {
  return {
    name: 'search-index',
    async allContentLoaded({ allContent, actions }) {
      const en = context.i18n.currentLocale === 'en',
        prefix = en ? '/en' : '';
      const content = collectContent(allContent, prefix).map((e) => ({
        id: e.id,
        type: e.type,
        title: en ? e.titleEn || e.title : e.title,
        description: en ? e.descriptionEn || e.description : e.description,
        href: e.href,
        topic: e.domain,
        tags: [...(e.tags || []),...(e.aliases || []),...(e.short ? [e.short] : [])],
        status: e.status,
      }));
      const radar = signals(news, config).map((e) => ({
        id: e.id,
        type: 'radar',
        title: e.translations?.[en ? 'en' : 'zh']?.title || e.title,
        description: (
          e.translations?.[en ? 'en' : 'zh']?.summary ||
          e.summary ||
          ''
        ).slice(0, 300),
        href: prefix + '/radar#signal-' + e.id,
        topic: e.category,
        tags: [e.domain],
        status: e.verificationStatus,
      }));
      await actions.createData(
        'index.json',
        JSON.stringify([...content, ...radar]),
      );
    },
  };
};
