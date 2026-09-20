import "../globals.css";
import "../editorial.css";
import { resolveSegments } from "../../lib/content";
import VisitAnalytics from "../../components/VisitAnalytics";
import { themeScript } from "../../lib/theme-init.mjs";
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
export default async function RootLayout({ children, params }) {
  const { locale } = resolveSegments((await params).segments);
  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        {process.env.VERCEL_ENV === "production" && <VisitAnalytics />}
      </body>
    </html>
  );
}
