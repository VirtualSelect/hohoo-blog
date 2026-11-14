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

export const secretNames: Record<ArtworkDesign, [string, string, string]> = {
  space: ["小熊星座", "Bear constellation", "小熊星座"],
  clear: ["莫比乌斯带", "Möbius strip", "莫比烏斯帶"],
  classic: ["折翼纸鹤", "Origami crane", "折翼紙鶴"],
  garden: ["星籽蝴蝶", "Starlit butterfly", "星籽蝴蝶"],
  photo: ["九叶光圈", "Nine-blade iris", "九葉光圈"],
  construct: ["机械花", "Mechanical bloom", "機械花"],
  map: ["超立方体投影", "Tesseract projection", "超立方體投影"],
  chapters: ["书页纸船", "Paper boat", "書頁紙船"],
};
export const secretMessages: Record<ArtworkDesign, [string, string, string]> = {
  space: [
    "小熊仍藏在原来的星空里。",
    "The bear still lives among the original stars.",
    "小熊仍藏在原來的星空裡。",
  ],
  clear: [
    "沿着曲面走一圈，回到另一面。",
    "Follow the surface around to its other side.",
    "沿著曲面走一圈，回到另一面。",
  ],
  classic: [
    "纸页折起，一只纸鹤展开双翼。",
    "The page folds into a crane with unfolding wings.",
    "紙頁折起，一隻紙鶴展開雙翼。",
  ],
  garden: [
    "枝脉之间，星籽变成蝴蝶。",
    "Among the branches, the starlight becomes a butterfly.",
    "枝脈之間，星籽變成蝴蝶。",
  ],
  photo: [
    "光圈开合，让另一束光穿过。",
    "The iris opens to let a different light through.",
    "光圈開合，讓另一束光穿過。",
  ],
  construct: [
    "结构解锁，机械花缓缓展开。",
    "The structure unlocks into a mechanical bloom.",
    "結構解鎖，機械花緩緩展開。",
  ],
  map: [
    "四维旋转的三维投影，仅作数学艺术示意。",
    "A three-dimensional projection of a rotating tesseract: mathematical art.",
    "四維旋轉的三維投影，僅作數學藝術示意。",
  ],
  chapters: [
    "书页化作纸船，带着好奇心出发。",
    "A page becomes a boat, setting out with curiosity.",
    "書頁化作紙船，帶著好奇心出發。",
  ],
};
