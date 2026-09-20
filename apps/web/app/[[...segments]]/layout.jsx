import "../globals.css";
import { resolveSegments } from "../../lib/content";
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
  "(()=>{let t;try{t=localStorage.getItem('huhohoo.theme.v1')}catch{}document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()";
export default async function RootLayout({ children, params }) {
  const { locale } = resolveSegments((await params).segments);
  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
