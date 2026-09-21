import path from "node:path";
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
    return ["", "/en", "/zh-TW"].map((prefix) => ({
      source: prefix + "/blog/a%20new%20milestone",
      destination: prefix + "/blog/a-new-milestone",
      permanent: true,
    }));
  },
  outputFileTracingRoot: root,
  outputFileTracingIncludes: { "/api/visitors": ["./generated/zh-CN.json"] },
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
