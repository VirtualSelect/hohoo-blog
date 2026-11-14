import React from "react";
import Layout from "@lab/runtime/Layout";
import { useText } from "@lab/components/Shell";
import ChangelogTimeline from "@lab/components/ChangelogTimeline";
export default function Changelog() {
  const t = useText();
  const includePreview =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_SITE_PREVIEW === "1";
  return (
    <Layout
      title={t("站点演进", "Site evolution", "網站演進")}
      description={t(
        "内容与体验的变化，保留可追溯的记录。",
        "Traceable changes to the site's content and reading experience.",
        "內容與體驗的變化，保留可追溯的記錄。",
      )}
    >
      <ChangelogTimeline includePreview={includePreview} />
    </Layout>
  );
}
