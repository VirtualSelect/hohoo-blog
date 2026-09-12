import "./globals.css";
import { headers } from "next/headers";
export const metadata = {
  metadataBase: new URL("https://huhohoo.com"),
  title: { default: "Hohoo's AI Lab", template: "%s · Hohoo" },
  description: "公开学习、实验、构建与分享 AI。",
  icons: {
    icon: { url: "/img/hohoo.jpg", type: "image/jpeg" },
    shortcut: "/img/hohoo.jpg",
    apple: "/img/hohoo.jpg",
  },
};
const themeScript =
  "try{document.documentElement.dataset.theme=localStorage.getItem('huhohoo.theme.v1')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}";
export default async function RootLayout({ children }) {
  const locale = (await headers()).get("x-lab-locale") || "zh-CN";
  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
