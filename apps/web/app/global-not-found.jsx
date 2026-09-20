import "./globals.css";
import "./editorial.css";
import NotFound from "./[[...segments]]/not-found";
import { themeScript } from "../lib/theme-init.mjs";
export default function GlobalNotFound() {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="icon" href="/img/hohoo.jpg" />
      </head>
      <body>
        <NotFound />
      </body>
    </html>
  );
}
