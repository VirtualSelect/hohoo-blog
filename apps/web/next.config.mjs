import path from "node:path";
import contentRedirects from "../../data/content-redirects.json" with { type: "json" };
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const aliases = { "@site": root, "@lab": here };
export default {
  poweredByHeader: false,
  experimental: { globalNotFound: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return ["", "/en", "/zh-TW"].flatMap((prefix) => [
      ...Object.entries(contentRedirects).map(([source, destination]) => ({
        source: prefix + source,
        destination: prefix + destination,
        permanent: true,
      })),
      {
        source: prefix + "/blog/a%20new%20milestone",
        destination: prefix + "/blog/a-new-milestone",
        permanent: true,
      },
      {
        source: prefix + "/news/daily/2026-10-05",
        destination: prefix + "/radar",
        permanent: true,
      },
      {
        source: prefix + "/radar/weekly/2026-W36",
        destination: prefix + "/radar/weekly",
        permanent: true,
      },
    ]);
  },
  outputFileTracingRoot: root,
  webpack(config) {
    config.module.rules.push({
      test: /\.(vert|frag|glsl)$/,
      type: "asset/source",
    });
    Object.assign(config.resolve.alias, aliases, {
      react$: path.join(here, "node_modules/react"),
      "react-dom$": path.join(here, "node_modules/react-dom"),
      "react/jsx-runtime$": path.join(
        here,
        "node_modules/react/jsx-runtime.js",
      ),
      "react/jsx-dev-runtime$": path.join(
        here,
        "node_modules/react/jsx-dev-runtime.js",
      ),
    });
    return config;
  },
};
