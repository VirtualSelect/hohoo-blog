"use client";
import { Analytics } from "@vercel/analytics/next";
import { redactVisit } from "../lib/visitor-stats.mjs";
export default function VisitAnalytics() {
  return <Analytics beforeSend={redactVisit} />;
}
