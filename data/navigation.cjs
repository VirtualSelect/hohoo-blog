// Shared by the Docusaurus navbar, footer and quick navigation.
const links = {
  learning: { label: '阅读路线', en: 'Learning', to: '/learning' },
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
    ...groups.map(({ label, ids }) => ({
      label,
      position: 'right',
      items: ids.map(item),
    })),
    { ...item('blog'), position: 'right' },
    { type: 'localeDropdown', position: 'right' },
  ],
  footer: [
    {
      title: 'EXPLORE',
      items: ['learning', 'projects', 'labs', 'radar'].map(item),
    },
    { title: 'KNOWLEDGE', items: ['notes', 'papers', 'blog'].map(item) },
  ],
};
