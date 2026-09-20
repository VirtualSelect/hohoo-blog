import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.PREVIEW_URL || "http://localhost:4181";
const results = [];
for (const route of ["/", "/docs/ai-apps/java-first-llm", "/radar", "/about"]) {
  const samples = [];
  for (let n = 0; n < 3; n++) {
    const start = performance.now();
    const response = await fetch(new URL(route, base));
    const headersAt = performance.now();
    const html = await response.text();
    const bodyAt = performance.now();
    if (!response.ok || !html.includes("<h1"))
      throw new Error("Page unavailable: " + route);
    const scripts = [
      ...new Set(
        [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
      ),
    ];
    const localSizes = await Promise.all(
      scripts
        .filter((s) => s.startsWith("/_next/static/"))
        .map(
          async (s) =>
            (
              await fs.stat(
                path.join(
                  root,
                  ".next",
                  decodeURIComponent(s.replace("/_next/", "")),
                ),
              )
            ).size,
        ),
    );
    samples.push({
      headersMs: Math.round(headersAt - start),
      bodyMs: Math.round(bodyAt - start),
      htmlBytes: Buffer.byteLength(html),
      referencedJsBytes: localSizes.reduce((a, b) => a + b, 0),
      scriptCount: scripts.length,
      cache:
        response.headers.get("x-nextjs-cache") ||
        response.headers.get("x-vercel-cache"),
    });
  }
  results.push({ route, samples });
}
const report = {
  measuredAt: new Date().toISOString(),
  base,
  scope:
    "HTTP response and referenced local build assets. Not LCP, INP, CLS or browser execution time.",
  results,
};
console.log(JSON.stringify(report, null, 2));
