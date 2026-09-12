const { projectSignal } = require('../src/utils/radar-locale.cjs');
const { collectContent } = require('./content-index.cjs');
const { signals } = require('../src/utils/radar.cjs');
const news = require('../data/news/items.json');
const config = require('../config/news-sources.json');
module.exports = function (context) {
  return {
    name: 'search-index',
    async allContentLoaded({ allContent, actions }) {
      const en = context.i18n.currentLocale === 'en',
        prefix =
          context.i18n.currentLocale === context.i18n.defaultLocale
            ? ''
            : '/' + context.i18n.currentLocale;
      const content = collectContent(allContent, prefix)
        .filter((e) => e.translationStatus !== 'MISSING')
        .map((e) => ({
          id: e.id,
          type: e.type,
          title: e.title,
          description: e.description,
          href: e.href,
          topic: e.domain,
          tags: [
            ...(e.tags || []),
            ...(e.aliases || []),
            ...(e.short ? [e.short] : []),
          ],
          status: e.status,
        }));
      const radar = signals(news, config)
        .map((e) => projectSignal(e, context.i18n.currentLocale))
        .map((e) => ({
          id: e.id,
          type: 'radar',
          title:
            e.translations?.[
              en
                ? 'en'
                : context.i18n.currentLocale === 'zh-TW'
                  ? 'zh-TW'
                  : 'zh'
            ]?.title || e.title,
          description: (
            e.translations?.[en ? 'en' : 'zh']?.summary ||
            e.summary ||
            ''
          ).slice(0, 300),
          href: prefix + '/radar#signal-' + e.id,
          topic: e.category,
          tags: [e.domain, e.searchText],
          status: e.verificationStatus,
        }));
      await actions.createData(
        'index.json',
        JSON.stringify([
          ...content,
          {
            id: 'learning',
            type: 'learning',
            title: en
              ? 'Learning path'
              : context.i18n.currentLocale === 'zh-TW'
                ? '學習路線'
                : '学习路线',
            description: 'BUILD · UNDERSTAND · EXPLORE',
            href: prefix + '/learning',
            tags: ['Java', 'LLM', 'AI Engineering'],
            status: 'learning',
          },
          ...radar,
        ]),
      );
    },
  };
};
