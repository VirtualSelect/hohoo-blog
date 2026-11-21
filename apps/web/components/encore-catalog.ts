import type { ArtworkDesign } from "./theme-artwork-config";
type Text = [string, string, string];
type Entry = { title: Text; trigger: Text; description: Text };
export const secretNotes: Record<ArtworkDesign, Entry> = {
  space: {
    title: ["掌中天文台", "Pocket observatory", "掌中天文臺"],
    trigger: ["推开穹顶", "Open the dome", "推開穹頂"],
    description: [
      "穹顶向两侧翻开，托起一颗带光环的行星。",
      "The split dome opens and lifts a ringed planet into its star arch.",
      "穹頂向兩側翻開，托起一顆帶光環的行星。",
    ],
  },
  clear: {
    title: ["飞鸟走马灯", "Birds in motion", "飛鳥走馬燈"],
    trigger: ["转动灯轮", "Turn the drum", "轉動燈輪"],
    description: [
      "蓝色围板滑开，鼓轮上的九幅鸟影接连转过眼前。",
      "Blue shutters slide back as nine bird studies circle the drum.",
      "藍色圍板滑開，鼓輪上的九幅鳥影接連轉過眼前。",
    ],
  },
  classic: {
    title: ["山门纸鹤", "Crane at the mountain gate", "山門紙鶴"],
    trigger: ["推开山门", "Open the gates", "推開山門"],
    description: [
      "山门打开，一只纸鹤从层叠的山影间升起，舒展双翼。",
      "The gates part and a folded crane rises between paper ridges, spreading its wings.",
      "山門打開，一隻紙鶴從層疊的山影間升起，舒展雙翼。",
    ],
  },
  garden: {
    title: ["睡莲与蜻蜓", "Water lily and dragonfly", "睡蓮與蜻蜓"],
    trigger: ["轻触花苞", "Touch the bud", "輕觸花苞"],
    description: [
      "浅粉色的睡莲一层层绽开，蜻蜓舒展透明的翅膀，停在花畔。",
      "The pink lily opens layer by layer. A dragonfly opens its translucent wings beside the bloom.",
      "淺粉色的睡蓮一層層綻開，蜻蜓舒展透明的翅膀，停在花畔。",
    ],
  },
  photo: {
    title: ["月影幻灯机", "Moonlight slide projector", "月影幻燈機"],
    trigger: ["点亮幻灯", "Light the projector", "點亮幻燈"],
    description: [
      "箱盖打开，玻璃幻灯片就位，一束暖光将山影与月亮投到银幕上。",
      "The lid lifts and a glass slide moves into place. Warm light casts a mountain and moon onto the screen.",
      "箱蓋打開，玻璃幻燈片就位，一束暖光將山影與月亮投到銀幕上。",
    ],
  },
  construct: {
    title: ["凸轮机械花", "Cam-driven bloom", "凸輪機械花"],
    trigger: ["给机关上弦", "Wind the mechanism", "給機關上弦"],
    description: [
      "方盒的四面依次折下，凸轮托起花芯，金属花瓣沿圆周展开。",
      "The four walls fold down. A cam lifts the centre and metal petals fan out around it.",
      "方盒的四面依次折下，凸輪托起花芯，金屬花瓣沿圓周展開。",
    ],
  },
  map: {
    title: ["群岛夜航", "Night passage", "群島夜航"],
    trigger: ["接通航标", "Light the channel", "接通航標"],
    description: [
      "两座吊桥先后落下，一点金光穿过三座小岛，点亮尽头的灯塔。",
      "Two bridges lower in turn. A point of light crosses three islands and lights the lighthouse.",
      "兩座吊橋先後落下，一點金光穿過三座小島，點亮盡頭的燈塔。",
    ],
  },
  chapters: {
    title: ["月港纸剧场", "Moon harbour paper theatre", "月港紙劇場"],
    trigger: ["翻开夜港", "Unfold the harbour", "翻開夜港"],
    description: [
      "纸拱一层层立起，月亮从港口升起，一艘双烟囱小船驶过舞台。",
      "Paper arches rise around the moonlit harbour as a twin-funnel ferry crosses the stage.",
      "紙拱一層層立起，月亮從港口升起，一艘雙煙囪小船駛過舞臺。",
    ],
  },
};
