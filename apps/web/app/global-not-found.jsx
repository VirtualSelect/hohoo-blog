import "./globals.css";
import "./editorial.css";
import NotFound from "./[[...segments]]/not-found";
import { themeScript } from "../lib/theme-init.mjs";
import { brandIcons } from "../lib/brand";
export default function GlobalNotFound() {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {brandIcons.icon.map((icon) => (
          <link
            key={icon.url}
            rel="icon"
            href={icon.url}
            type={icon.type}
            sizes={icon.sizes}
          />
        ))}
        <link
          rel="apple-touch-icon"
          href={brandIcons.apple.url}
          sizes={brandIcons.apple.sizes}
        />
      </head>
      <body>
        <NotFound />
      </body>
    </html>
  );
}
