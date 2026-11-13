// Shared by the before-paint bootstrap and the interactive design picker.
export const designPreferenceKey = "huhohoo.design.v1";
export const legacyThemePreferenceKey = "huhohoo.theme.v1";

export const designThemes = [
  {
    id: "space",
    code: "A",
    mode: "dark",
    label: ["研究空间", "Research space", "研究空間"],
    shortLabel: ["研究", "Space", "研究"],
    description: [
      "午夜蓝研究航线与底部导航，探索实验与项目。",
      "Midnight-blue research routes and dock navigation for experiments and projects.",
      "午夜藍研究航線與底部導覽，探索實驗與專案。",
    ],
  },
  {
    id: "clear",
    code: "B",
    mode: "light",
    label: ["清晰阅读", "Clear reading", "清晰閱讀"],
    shortLabel: ["阅读", "Reading", "閱讀"],
    description: [
      "白色文档布局与清晰索引，适合连续阅读。",
      "A bright document layout and clear index for focused reading.",
      "白色文件佈局與清晰索引，適合連續閱讀。",
    ],
  },
  {
    id: "classic",
    code: "C",
    mode: "light",
    label: ["主干手记", "Field notes", "主幹手記"],
    shortLabel: ["手记", "Notes", "手記"],
    description: [
      "主干的研究手记风格，保留左侧书桌目录。",
      "The main branch’s field-note style with a desk-like sidebar.",
      "主幹的研究手記風格，保留左側書桌目錄。",
    ],
  },
  {
    id: "garden",
    code: "D",
    mode: "light",
    label: ["插画花园", "Garden", "插畫花園"],
    shortLabel: ["花园", "Garden", "花園"],
    description: [
      "以植物、书页与小径铺开插画花园，沿研究方向探索内容。",
      "An illustrated garden of plants, books and paths leading into research topics.",
      "以植物、書頁與小徑鋪開插畫花園，沿研究方向探索內容。",
    ],
  },
  {
    id: "photo",
    code: "E",
    mode: "light",
    label: ["光影随记", "Light & notes", "光影隨記"],
    shortLabel: ["光影", "Light", "光影"],
    description: [
      "宽幅光影封面与安静的文字索引，记录学习与实践。",
      "A wide photographic cover and a quiet writing index for learning and practice.",
      "寬幅光影封面與安靜的文字索引，記錄學習與實作。",
    ],
  },
  {
    id: "construct",
    code: "F",
    mode: "light",
    label: ["几何构成", "Construct", "幾何構成"],
    shortLabel: ["构成", "Construct", "構成"],
    description: [
      "黑白网格、几何色块与清晰分区，让问题和作品并列呈现。",
      "A black-and-white grid with geometric accents, placing questions beside projects.",
      "黑白網格、幾何色塊與清晰分區，讓問題和作品並列呈現。",
    ],
  },
  {
    id: "map",
    code: "G",
    mode: "light",
    label: ["知识地图", "Knowledge atlas", "知識地圖"],
    shortLabel: ["地图", "Atlas", "地圖"],
    description: [
      "从主题目录与关联地图进入文章，手机使用分组关系列表。",
      "Explore articles through a topic directory and relationship map, grouped into lists on mobile.",
      "從主題目錄與關聯地圖進入文章，手機使用分組關係清單。",
    ],
  },
  {
    id: "chapters",
    code: "H",
    mode: "light",
    label: ["章节书册", "Chapters", "章節書冊"],
    shortLabel: ["书册", "Chapters", "書冊"],
    description: [
      "双页书册、章节目录与精选文章，手机自然收为单页阅读。",
      "An open reading spread with chapter contents and a featured article, becoming one page on mobile.",
      "雙頁書冊、章節目錄與精選文章，手機自然收為單頁閱讀。",
    ],
  },
];

export function resolveDesignPreference(
  designValue,
  legacyTheme,
  systemDark,
  registry = designThemes,
) {
  // Keep earlier saved previews usable without adding a bootstrap dependency.
  const canonicalDesign =
    designValue === "journal"
      ? "garden"
      : designValue === "gallery"
        ? "photo"
        : designValue;
  const selected = registry.find((theme) => theme.id === canonicalDesign);
  if (selected) return selected;
  const dark =
    legacyTheme === "dark" || (legacyTheme !== "light" && systemDark);
  return registry.find((theme) => theme.id === (dark ? "space" : "clear"));
}
