// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import social from "./data/social";

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: '你好，我是Hohoo👋',
    tagline: '在这里我会记录日常和工作及学习过程中所遇到问题与解决方案，忙时学习，闲时读书，希望我的分享对你有所启发。',
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
                        'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
                },
                blog: {
                    showReadingTime: true,
                    // Please change this to your repo.
                    // Remove this to remove the "edit this page" links.
                    editUrl:
                        'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
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
                    content: 'blog, javascript, web, java, mysql, spring',
                },
                {
                    name: 'keywords',
                    content: '后端开发者, Java',
                },
            ],
            // Replace with your project's data card
            image: 'img/docusaurus-data-card.jpg',
            navbar: {
                title: "Hohoo's Blog",
                logo: {
                    alt: "Hohoo's Blog",
                    src: 'img/hohoo.ico',
                },
                hideOnScroll: true,// 把导航栏样式设置为静态,而不禁用主题切换能力
                items: [
                    {to: '/blog/archive', label: '博客', position: 'right'},
                    {to: '/docs/skill', label: '笔记', position: 'right'},
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
                            {label: '技术笔记', to: 'docs/skill'},
                            {
                                label: '算法入门',
                                to: 'https://www.hello-algo.com/',
                            },
                        ],
                    },
                    {
                        title: '社交',
                        items: [
                            {label: '关于我', to: '/aboutMe'},
                            {label: 'GitHub', href: social.github.href},
                            {label: 'Twitter', href: social.twitter.href},
                        ],
                    },
                    {
                        title: '网站',
                        items: [
                            { label: 'Vercel', to: 'https://vercel.com' },
                            { label: '时间戳', to: 'https://tool.lu/timestamp' },
                            { label: 'JSON', to: 'https://www.json.cn' },
                            { label: 'Cron表达式', to: 'https://www.pppet.net' },
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
                copyright: `<p>Copyright © ${new Date().getFullYear()} Hohoo, Inc. Built with Docusaurus.</p>
                <br />本站所有内容遵循 <a rel="license" href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh-Hans" 
                style="color: hsl(210deg, 100%, 80%)">CC BY-NC 4.0 协议</a>，转载须注明署名和出处，且不可用于商业用途。
                若与其他同步平台协议冲突，以本网站为准。`,
            },
            // giscus 评论功能
            giscus: {
                repo: 'VirtualSelect/blog',
                repoId: 'R_kgDOMFT5Pw',
                category: 'Announcements',
                categoryId: 'DIC_kwDOMFT5P84Cf6Pv',
                theme: 'light',
                darkTheme: 'dark_dimmed',
            },
            plugins: [
                'docusaurus-plugin-sass'
            ],
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
