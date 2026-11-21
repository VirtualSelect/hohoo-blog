export type ArtworkDesign =
  | "space"
  | "clear"
  | "classic"
  | "garden"
  | "photo"
  | "construct"
  | "map"
  | "chapters";
export type ArtworkKind =
  | "crystal"
  | "metal"
  | "terrain"
  | "growth"
  | "optics"
  | "compute"
  | "weave"
  | "orrery";
export const defaults: Record<ArtworkDesign, ArtworkKind> = {
  space: "crystal",
  clear: "metal",
  classic: "terrain",
  garden: "growth",
  photo: "optics",
  construct: "compute",
  map: "weave",
  chapters: "orrery",
};
export const designs = Object.keys(defaults) as ArtworkDesign[];
export const kinds: ArtworkKind[] = [
  "crystal",
  "metal",
  "compute",
  "weave",
  "growth",
  "terrain",
  "optics",
  "orrery",
];
export const artworkNames: Record<ArtworkKind, [string, string, string]> = {
  crystal: ["黑曜晶核", "Obsidian core", "黑曜晶核"],
  metal: ["液态回路", "Liquid circuit", "液態迴路"],
  compute: ["悬浮计算体", "Floating compute", "懸浮計算體"],
  weave: ["光织之幕", "Light weave", "光織之幕"],
  growth: ["枝叶生长", "Branching growth", "枝葉生長"],
  terrain: ["纸雕地景", "Paper terrain", "紙雕地景"],
  optics: ["光学镜组", "Optical assembly", "光學鏡組"],
  orrery: ["黄铜星盘", "Brass orrery", "黃銅星盤"],
};
export const aboutActions: Record<ArtworkDesign, [string, string, string]> = {
  space: ["拨动星流", "Stir the stars", "撥動星流"],
  clear: ["舒展星阵", "Unfold the constellation", "舒展星陣"],
  classic: ["展开星谱", "Unfold the star chart", "展開星譜"],
  garden: ["舒展枝脉", "Unfurl the branches", "舒展枝脈"],
  photo: ["让光穿过", "Let light through", "讓光穿過"],
  construct: ["解构星图", "Deconstruct the stars", "解構星圖"],
  map: ["展开星网", "Unfold the star mesh", "展開星網"],
  chapters: ["翻开星海", "Open the paper sky", "翻開星海"],
};
