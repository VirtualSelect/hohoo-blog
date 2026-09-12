// Shared by the Docusaurus navbar, footer and quick navigation.
const links = {
  articles: { label: '文章', en: 'Articles', to: '/articles' },
  build: { label: '实践', en: 'Build', to: '/build' },
  learning: { label: '学习', en: 'Learning', to: '/learning' },
  research: { label: '研究总览', en: 'Research', to: '/research' },
  radar: { label: 'AI Radar', en: 'AI Radar', to: '/radar' },
  timeline: { label: '学习活动', en: 'Activity', to: '/timeline' },
  projects: { label: '项目', en: 'Projects', to: '/projects' },
  labs: { label: '实验', en: 'Labs', to: '/labs' },
  notes: { label: '短笔记', en: 'Notes', to: '/notes' },
  papers: { label: '论文阅读', en: 'Papers', to: '/papers' },
  reading: { label: '阅读清单', en: 'Reading Inbox', to: '/reading' },
  blog: { label: '随笔', en: 'Blog', to: '/blog' },
  now: { label: '近况', en: 'Now', to: '/now' },
  about: { label: '关于', en: 'About', to: '/about' },
  rss: { label: 'RSS', en: 'RSS', to: '/subscribe' },
};
const groups = [
  { label: '学习', ids: ['learning', 'research', 'radar', 'timeline'] },
  { label: '构建', ids: ['projects', 'labs'] },
  { label: '知识', ids: ['notes', 'papers'] },
];
const item = (id) => {
  const { en, ...link } = links[id];
  return link;
};
module.exports = {
  links,
  navbar: [
    ...['articles', 'learning', 'build', 'radar', 'about'].map((id) => ({
      ...item(id),
      label:
        id === 'learning' ? '学习' : id === 'radar' ? 'Radar' : links[id].label,
      position: 'right',
    })),
    { type: 'search', position: 'right' },
    { type: 'localeDropdown', position: 'right' },
  ],
  footer: [
    {
      title: 'READ',
      items: ['articles', 'learning', 'blog'].map(item),
    },
    { title: 'BUILD', items: ['build', 'projects', 'labs'].map(item) },
    {
      title: 'DISCOVER',
      items: ['radar', 'research', 'papers', 'reading'].map(item),
    },
  ],
};
