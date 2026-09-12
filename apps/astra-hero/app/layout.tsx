import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Hohoo — 探索智能，构建可能',
  description: 'Hohoo 的个人 AI 实验室。公开学习，持续构建，从模型到应用，再走向真实世界。',
  openGraph: { title: 'Hohoo’s AI Lab', description: 'Learning in public. Building in public.', type: 'website', locale: 'zh_CN' },
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
