const news = require('../data/news/items.json');
const config = require('../config/news-sources.json');
const { isoWeek, signals } = require('../src/utils/radar.cjs');
module.exports = function (context) {
  return {
    name: 'radar-pages',
    async loadContent() {
      const grouped = new Map();
      for (const item of signals(news, config)) {
        const week = isoWeek(item.publishedAt);
        if (!grouped.has(week)) grouped.set(week, []);
        grouped.get(week).push(item);
      }
      return [...grouped].map(([week, items]) => ({ week, items }));
    },
    async contentLoaded({ content, actions }) {
      const prefix = context.i18n.currentLocale === 'en' ? '/en' : '';
      const preview = signals(news, config)
        .slice(0, 3)
        .map(
          ({
            id,
            title,
            url,
            sourceId,
            sourceName,
            publishedAt,
            summary,
            summaryKind,
            translations,
            sourceType,
            domain,
            verificationStatus,
          }) => ({
            id,
            title,
            url,
            sourceId,
            sourceName,
            publishedAt,
            summary,
            summaryKind,
            translations,
            sourceType,
            domain,
            verificationStatus,
          }),
        );
      actions.setGlobalData({ preview });
      for (const group of content) {
        const data = await actions.createData(
          group.week + '.json',
          JSON.stringify(group),
        );
        actions.addRoute({
          path: prefix + '/radar/weekly/' + group.week,
          component: '@site/src/components/RadarWeekly.js',
          exact: true,
          modules: { digest: data },
        });
      }
    },
  };
};
