// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import social from './data/social.ts';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Hohoo's AI Lab",
  tagline: '聚焦 AI 应用开发、LLM 分享与具身智能，记录学习、实验和实践。',
  favicon: 'img/hohoo.ico',

  // Set the production url of your site here
  url: 'https://huhohoo.com/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'Hohoo', // Usually your GitHub org/user name.
  projectName: "Hohoo's Blog", // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['en', 'zh-CN'],
    localeConfigs: {
      en: {
        htmlLang: 'en-GB',
      },
      'zh-CN': {
        htmlLang: 'zh-CN',
      },
    },
  },

  plugins: [
    './plugins/learning-index.cjs',
    './plugins/news-feed.cjs',
    './plugins/content-index.cjs',
    './plugins/route-redirects.cjs',
    './plugins/radar-pages.cjs',
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        sitemap: {
          ignorePatterns: ['/aboutMe', '/en/aboutMe', '/news', '/en/news'],
        },
        docs: {
          sidebarPath: './sidebars.js',
          exclude: [
            '**/ROADMAP.md',
            '**/DESIGN-SYSTEM.md',
            '**/CONTENT-MODEL.md',
            '**/AI-RADAR.md',
            '**/templates/**',
          ],
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/VirtualSelect/hohoo-blog/edit/main/',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/VirtualSelect/hohoo-blog/edit/main/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      metadata: [
        {
          name: 'author',
          content: 'Hohoo',
        },
        {
          name: 'keywords',
          content: 'AI 应用开发, LLM, 大语言模型, 具身智能, RAG, Agent',
        },
      ],
      // Replace with your project's data card
      image: 'img/hohoo.jpg',
      navbar: {
        title: 'Hohoo.',
        logo: {
          alt: 'Hohoo',
          src: 'img/hohoo.ico',
        },
        hideOnScroll: true, // 把导航栏样式设置为静态,而不禁用主题切换能力
        items: [
          {
            label: '学习',
            position: 'right',
            items: [
              { label: '阅读路线', to: '/learning' },
              { label: '研究总览', to: '/research' },
              { label: 'AI Radar', to: '/radar' },
              { label: '学习活动', to: '/timeline' },
            ],
          },
          {
            label: '构建',
            position: 'right',
            items: [
              { label: '项目', to: '/projects' },
              { label: '实验', to: '/labs' },
            ],
          },
          {
            label: '知识',
            position: 'right',
            items: [
              { label: '短笔记', to: '/notes' },
              { label: '论文阅读', to: '/papers' },
            ],
          },
          { label: '随笔', to: '/blog', position: 'right' },
          {
            type: 'localeDropdown',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'light',
        links: [
          {
            title: 'EXPLORE',
            items: [
              { label: '阅读路线', to: '/learning' },
              { label: '项目', to: '/projects' },
              { label: '实验', to: '/labs' },
              { label: 'AI Radar', to: '/radar' },
            ],
          },
          {
            title: 'KNOWLEDGE',
            items: [
              { label: '短笔记', to: '/notes' },
              { label: '论文阅读', to: '/papers' },
              { label: '随笔', to: '/blog' },
            ],
          },
          {
            title: 'ELSEWHERE',
            items: [
              { label: 'GitHub', href: social.github.href },
              { label: 'X', href: social.twitter.href },
              { label: 'RSS', to: '/subscribe' },
              { label: '关于', to: '/about' },
            ],
          },
        ],
        copyright: `<p>Hohoo. Learning in public. Building in public.</p><p>Copyright © ${new Date().getFullYear()} Hohoo Built with Docusaurus.</p>
                本站所有内容遵循 <a rel="license" href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh-Hans"
                >CC BY-NC 4.0 协议</a>，转载须注明署名和出处，且不可用于商业用途。
                若与其他同步平台协议冲突，以本网站为准。`,
      },
      // giscus 评论功能
      giscus: {
        repo: 'VirtualSelect/hohoo-blog',
        repoId: 'R_kgDOMVE0jA',
        category: 'General',
        categoryId: 'DIC_kwDOMVE0jM4Cgui_',
        theme: 'light',
        darkTheme: 'dark_dimmed',
      },

      // Algolia 搜索功能
      algolia: {
        appId: '69CJV5KUH7',
        apiKey: '62bd44a01613f82c222b44792cc49500',
        indexName: 'huhohoo',
        // 启用上下文搜索
        contextualSearch: true,

        //... other Algolia params
      },
    }),
};

export default config;
