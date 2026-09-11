// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import social from "./data/social.ts";

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "Hohoo's Blog",
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

    plugins: ['./plugins/learning-index.cjs'],

    presets: [
        [
            'classic',
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: './sidebars.js',
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl:
                        'https://github.com/VirtualSelect/hohoo-blog/edit/main/',
                },
                blog: {
                    showReadingTime: true,
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl:
                        'https://github.com/VirtualSelect/hohoo-blog/edit/main/',
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
                title: "Hohoo's Blog",
                logo: {
                    alt: "Hohoo's Blog",
                    src: 'img/hohoo.ico',
                },
                hideOnScroll: true,// 把导航栏样式设置为静态,而不禁用主题切换能力
                items: [
                    {to: '/blog', label: '随笔', position: 'right'},

                    {to: '/docs/skill', label: '专题', position: 'right'},
                    {to: '/learning', label: '阅读路线', position: 'right'},
                    {to: '/aboutMe', label: '关于我', position: 'right'},
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
                        title: '学习',
                        items: [
                            {label: 'AI 应用开发', to: '/docs/ai-apps'},
                            {label: 'LLM 分享', to: '/docs/llm'},
                            {label: '具身智能', to: '/docs/embodied-ai'},
                        ],
                    },
                    {
                        title: '社交',
                        items: [
                            {label: '关于我', to: '/aboutMe'},
                            {label: '最近在做什么', to: '/now'},
                            {label: 'GitHub', href: social.github.href},
                            {label: 'Twitter', href: social.twitter.href},
                        ],
                    },
                    {
                        title: '网站',
                        items: [
                            { label: 'Vercel', to: 'https://vercel.com' },
                            { label: 'Docusaurus', to: 'https://docusaurus.io/zh-CN/' },
                        ],
                    },
                    {
                        title: '友情链接',
                        items: [
                            {label: '宇宁', to: 'https://yn-wiki.com'},
                            {label: '峰华前端工程师', to: 'https://zxuqian.cn'},
                            {label: '愧怍', to: 'https://kuizuo.cn'},
                            {label: 'roc 云原生', to: 'https://imroc.cc'},
                        ],
                    },
                ],
                copyright: `<p>Copyright © ${new Date().getFullYear()} Hohoo Built with Docusaurus.</p>
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
