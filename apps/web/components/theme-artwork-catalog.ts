import type { ArtworkDesign } from "./theme-artwork-config";

type Text = [string, string, string];
interface ObjectNotes {
  name: Text;
  motion: Text;
  description: Text;
}
const note = (name: Text, motion: Text, description: Text): ObjectNotes => ({
  name,
  motion,
  description,
});
export const objectNotes: Record<
  ArtworkDesign,
  { home: ObjectNotes; about: ObjectNotes }
> = {
  space: {
    home: note(
      ["剖面晶洞", "Split geode", "剖面晶洞"],
      ["分开晶洞", "Split the geode", "分開晶洞"],
      [
        "拨开两片黑色岩壳，浅色矿脉内的蓝晶露出不同的切面。",
        "Part the dark rock to see the blue crystal faces inside its pale mineral rim.",
        "撥開兩片黑色岩殼，淺色礦脈內的藍晶露出不同的切面。",
      ],
    ),
    about: note(
      ["六瓣星灯", "Star lantern", "六瓣星燈"],
      ["打开灯瓣", "Open the shutters", "打開燈瓣"],
      [
        "六片打孔的金属灯瓣向外翻开，露出中心的暖色灯芯。",
        "Six perforated shutters open around a warm central light.",
        "六片打孔的金屬燈瓣向外翻開，露出中心的暖色燈芯。",
      ],
    ),
  },
  clear: {
    home: note(
      ["桌面索引器", "Desktop index", "桌面索引器"],
      ["抽出索引页", "Extend the index", "抽出索引頁"],
      [
        "蓝边页签沿导轨错开，可以停在中间看每层的间距。",
        "Blue-edged dividers slide along their rails. Stop halfway to see the spacing.",
        "藍邊頁籤沿導軌錯開，可以停在中間看每層的間距。",
      ],
    ),
    about: note(
      ["档案转轮", "Rotary card file", "檔案轉輪"],
      ["扇开档案轮", "Fan the cards", "扇開檔案輪"],
      [
        "从侧面转动蓝白卡片，观察它们沿轴心展开的次序。",
        "View the blue and white cards from the side as they fan around the axle.",
        "從側面轉動藍白卡片，觀察它們沿軸心展開的次序。",
      ],
    ),
  },
  classic: {
    home: note(
      ["溪谷地形匣", "Valley relief", "溪谷地形匣"],
      ["分离地层", "Separate the strata", "分離地層"],
      [
        "沿黄铜定位针分开两岸的纸层，中间的溪谷贯穿整只匣子。",
        "Lift the paper strata along the brass pins to trace the stream through the valley.",
        "沿黃銅定位針分開兩岸的紙層，中間的溪谷貫穿整隻匣子。",
      ],
    ),
    about: note(
      ["山行折景册", "Mountain concertina", "山行摺景冊"],
      ["展开折景册", "Unfold the landscape", "展開摺景冊"],
      [
        "翻开五折剪纸景册，山脊、松林与月亮随折痕连成一幅风景。",
        "Open five folded panels to join the cut-paper ridges, pines and moon.",
        "翻開五摺剪紙景冊，山脊、松林與月亮隨摺痕連成一幅風景。",
      ],
    ),
  },
  garden: {
    home: note(
      ["一钵铃兰", "Lily of the valley", "一缽鈴蘭"],
      ["舒展花枝", "Unfurl the stems", "舒展花枝"],
      [
        "奶白色的钟形小花垂在叶片后。轻轻拨开花枝，便能看见花冠里的花蕊。",
        "Follow the curved stems down to the ivory bells. Ease the foliage apart to see the stamens.",
        "奶白色的鐘形小花垂在葉片後。輕輕撥開花枝，便能看見花冠裡的花蕊。",
      ],
    ),
    about: note(
      ["花枝绣绷", "Botanical embroidery hoop", "花枝繡繃"],
      ["摊开绣瓣", "Spread the petals", "攤開繡瓣"],
      [
        "木绷上的花枝用丝线勾勒。转到侧面，看花瓣沿针脚向外摊开。",
        "Silk thread traces a branch across the wooden hoop. From the side, watch each petal spread out along the stitches.",
        "木繃上的花枝用絲線勾勒。轉到側面，看花瓣沿針腳向外攤開。",
      ],
    ),
  },
  photo: {
    home: note(
      ["镜组取景器", "Optical viewfinder", "鏡組取景器"],
      ["伸出内镜组", "Extend the optics", "伸出內鏡組"],
      [
        "镜筒从奶白机身向前伸出，斜看能分清玻璃、螺纹与遮光罩的距离。",
        "Extend the barrel from the enamel body and view the spacing between glass, threads and hood.",
        "鏡筒從奶白機身向前伸出，斜看能分清玻璃、螺紋與遮光罩的距離。",
      ],
    ),
    about: note(
      ["折叠座机", "Bellows camera", "摺疊座機"],
      ["拉开蛇腹", "Extend the bellows", "拉開蛇腹"],
      [
        "沿机座拉出前镜板，蛇腹的每道折纹随之打开。",
        "Pull the lens board along the bed and watch each pleat open.",
        "沿機座拉出前鏡板，蛇腹的每道摺紋隨之打開。",
      ],
    ),
  },
  construct: {
    home: note(
      ["掌上计算器", "Pocket calculator", "掌上計算機"],
      ["拆开计算器", "Explode the case", "拆開計算機"],
      [
        "按键、面板和线路板沿装配轴分开。侧看最容易看清各层的位置。",
        "Separate the keys, case and circuit board along their assembly axis.",
        "按鍵、面板和線路板沿裝配軸分開。側看最容易看清各層的位置。",
      ],
    ),
    about: note(
      ["剪式升降台", "Scissor lift", "剪式升降台"],
      ["升起平台", "Raise the platform", "升起平台"],
      [
        "交错连杆绕铰点转动，红色平台在两级支架上升高。",
        "The crossing links rotate at their joints and raise the red platform.",
        "交錯連桿繞鉸點轉動，紅色平台在兩級支架上升高。",
      ],
    ),
  },
  map: {
    home: note(
      ["桌上织机", "Table loom", "桌上織機"],
      ["投梭换纬", "Pass the shuttle", "投梭換緯"],
      [
        "沿着青绿的经纬找到木梭。移过梭子，看综杆抬升和布面上交错的菱纹。",
        "Follow the teal threads to the wooden shuttle. Move it across as the heddle lifts.",
        "沿著青綠的經緯找到木梭。移過梭子，看綜桿抬升和布面上交錯的菱紋。",
      ],
    ),
    about: note(
      ["分层路线盘", "Layered route atlas", "分層路線盤"],
      ["拉开路线层", "Separate the layers", "拉開路線層"],
      [
        "三层透明板各有一条路线。沿定位柱拉开，观察重叠的点如何分开。",
        "Separate the three transparent route plates along their guide posts.",
        "三層透明板各有一條路線。沿定位柱拉開，觀察重疊的點如何分開。",
      ],
    ),
  },
  chapters: {
    home: note(
      ["黄铜日晷", "Brass sundial", "黃銅日晷"],
      ["立起晷针", "Raise the gnomon", "立起晷針"],
      [
        "将镂空晷针从刻度盘上立起，转动视角看指针与仪盘的夹角。",
        "Raise the pierced gnomon and turn the dial to inspect its angle.",
        "將鏤空晷針從刻度盤上立起，轉動視角看指針與儀盤的夾角。",
      ],
    ),
    about: note(
      ["海上立体书", "Pop-up seascape", "海上立體書"],
      ["翻起纸船", "Raise the paper boat", "翻起紙船"],
      [
        "翻动酒红封皮的立体书，三层纸浪和一只折帆船从书脊间支起来。",
        "Turn the burgundy-bound book open to lift three waves and a folded sailboat.",
        "翻動酒紅封皮的立體書，三層紙浪和一隻摺帆船從書脊間支起來。",
      ],
    ),
  },
};
