"use client";
import { useSyncExternalStore } from "react";
import { designs, type ArtworkDesign } from "./theme-artwork-config";
import { objectNotes } from "./theme-artwork-catalog";
import { useText } from "./Shell";

function subscribe(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-design"],
  });
  return () => observer.disconnect();
}
function current(): ArtworkDesign {
  const value = document.documentElement.dataset.design as ArtworkDesign;
  return designs.includes(value) ? value : "space";
}
export default function ExhibitionIndex() {
  const theme = useSyncExternalStore(
    subscribe,
    current,
    () => "space" as ArtworkDesign,
  );
  const t = useText();
  return (
    <nav
      className="rev3-index"
      aria-label={t("首页导航", "Homepage navigation", "首頁導覽")}
    >
      <a href="#atlas-recent-heading">
        {t("最近写下", "Recent writing", "最近寫下")}
      </a>
      <a href="#atlas-project-heading">
        {t("项目与实验", "Projects and labs", "專案與實驗")}
      </a>
      <a href="#theme-object" className="rev3-index-object">
        <img
          src={`/media/theme-objects-v3/${theme}-home.webp`}
          width="66"
          height="44"
          alt=""
          decoding="async"
        />
        <span>{t(...objectNotes[theme].home.name)}</span>
        <span aria-hidden="true">↓</span>
      </a>
    </nav>
  );
}
