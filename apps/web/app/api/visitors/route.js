import { getContent } from "../../../lib/content";
import { unstable_cache } from "next/cache";
import {
  canonicalPath,
  publicPaths,
  publicCountries,
} from "../../../lib/visitor-stats.mjs";

export const dynamic = "force-dynamic";
const cacheHeaders = {
  "Cache-Control":
    "public, max-age=60, s-maxage=600, stale-while-revalidate=600",
};
// Explicit data cache survives dynamic route requests, including CDN misses.
const readAnalytics = unstable_cache(
  async (endpoint, params) => {
    const response = await fetch(
      `https://api.vercel.com/v1/query/web-analytics/visits/${endpoint}?${params}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_ANALYTICS_TOKEN}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = String(body.error?.message || body.message || "");
      // Log only fixed diagnostic categories, never the response body or credentials.
      console.warn("visitor_query_failed", {
        endpoint,
        status: response.status,
        fields: [
          "projectId",
          "teamId",
          "since",
          "until",
          "by",
          "limit",
          "filter",
        ].filter((field) => message.includes(field)),
        code: [
          "bad_request",
          "invalid_request",
          "validation_error",
          "forbidden",
          "not_found",
        ].includes(body.error?.code)
          ? body.error.code
          : "other",
        missing: /required|missing/i.test(message),
        range: /maximum|minimum|greater|less|range/i.test(message),
        parameter: new URLSearchParams(params).get("by") || "totals",
      });
      throw new Error(`upstream_${response.status}`);
    }
    return (await response.json()).data;
  },
  ["visitor-analytics-v1"],
  { revalidate: 600 },
);
export async function GET() {
  const token = process.env.VERCEL_ANALYTICS_TOKEN;
  const projectId = process.env.VERCEL_ANALYTICS_PROJECT_ID;
  if (!token || !projectId)
    return Response.json({ status: "unconfigured" }, { headers: cacheHeaders });
  const until = new Date(
    Math.floor(Date.now() / 600000) * 600000,
  ).toISOString();
  const since = new Date(Date.parse(until) - 7 * 86400000).toISOString();
  async function query(endpoint, extra = {}) {
    const params = new URLSearchParams({ projectId, ...extra });
    if (process.env.VERCEL_ANALYTICS_TEAM_ID)
      params.set("teamId", process.env.VERCEL_ANALYTICS_TEAM_ID);
    return readAnalytics(endpoint, params.toString());
  }
  try {
    const [totals, paths, countries] = await Promise.all([
      query("count"),
      query("aggregate", { since, until, by: "requestPath", limit: "100" }),
      query("aggregate", { since, until, by: "country", limit: "100" }),
    ]);
    if (
      !Number.isSafeInteger(totals?.pageviews) ||
      !Number.isSafeInteger(totals?.visitors) ||
      totals.pageviews < 0 ||
      totals.visitors < 0
    )
      throw new Error("invalid_totals");
    const content = getContent("zh-CN");
    const entries = content.globalData["content-index"].entries;
    const allowed = new Set(entries.map((e) => canonicalPath(e.href)));
    for (const route of content.routes) allowed.add(canonicalPath("/" + route));
    return Response.json(
      {
        status: "ready",
        since,
        until,
        totals: { pageviews: totals.pageviews, visitors: totals.visitors },
        paths: publicPaths(paths, allowed),
        countries: publicCountries(countries),
      },
      { headers: cacheHeaders },
    );
  } catch (error) {
    console.warn("visitor_stats_unavailable", {
      reason: /^upstream_\d+$/.test(error.message)
        ? error.message
        : "invalid_or_unreachable",
    });
    return Response.json({ status: "unavailable" }, { headers: cacheHeaders });
  }
}
