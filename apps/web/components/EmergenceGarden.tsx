"use client";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useText } from "./Shell";
import Link from "../runtime/Link";
import { useSite } from "../runtime/context";
import GardenBoard from "./GardenBoard";
import GardenInspector from "./GardenInspector";
import {
  COLS,
  ROWS,
  SIZE,
  HISTORY_LIMIT,
  patterns,
  makePattern,
  createGarden,
  gardenReducer,
  encodeSeed,
  decodeSeed,
  gardenSvg,
  type Pattern,
} from "../lib/emergence";
import s from "./EmergenceGarden.module.css";

export default function EmergenceGarden() {
  const t = useText();
  const { locale } = useSite();
  const [state, dispatch] = useReducer(gardenReducer, undefined, () =>
    createGarden(),
  );
  const [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(3);
  const [edit, setEdit] = useState(false),
    [zoom, setZoom] = useState(false);
  const [selected, setSelected] = useState(7 * COLS + 12),
    [trailOn, setTrailOn] = useState(true);
  const [reduced, setReduced] = useState(false),
    [message, setMessage] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [flower, setFlower] = useState<Pattern | "custom">("garden");
  const root = useRef<HTMLDivElement>(null),
    exportUrl = useRef("");
  const board = state.frames[state.cursor],
    previous = state.frames[state.cursor - 1];
  const generation = state.offset + state.cursor;
  const population = board.reduce((sum, n) => sum + n, 0);
  const still = !!previous && board.every((n, i) => previous[i] === n);
  const terminal = population === 0 || still;
  const running = playing && !terminal && !reduced;
  const trail = useMemo(() => {
    const cells = new Set<number>();
    if (trailOn)
      state.frames
        .slice(Math.max(0, state.cursor - 5), state.cursor)
        .forEach((frame) =>
          frame.forEach((alive, i) => {
            if (alive) cells.add(i);
          }),
        );
    return cells;
  }, [state.frames, state.cursor, trailOn]);
  const names: Record<Pattern, string> = {
    garden: t("混合花园", "Mixed garden", "混合花園"),
    block: t("静物", "Still life", "靜物"),
    blinker: t("呼吸", "Breathing", "呼吸"),
    glider: t("远行", "Voyager", "遠行"),
    pulsar: t("脉动", "Pulsar", "脈動"),
  };
  const prompts: Record<Pattern, string> = {
    garden: t(
      "同一片花园里，有的驻足，有的远行。看看相遇后会发生什么。",
      "Some patterns stay, some travel. Watch what happens when they meet.",
      "同一片花園裡，有的駐足，有的遠行。看看相遇後會發生什麼。",
    ),
    block: t(
      "为什么四个格子可以一直不变？选中其中一个，数数邻居。",
      "Why do four cells stay unchanged? Select one and count its neighbors.",
      "為什麼四個格子可以一直不變？選中其中一個，數數鄰居。",
    ),
    blinker: t(
      "先猜一猜：单步两次后，它会回到哪里？",
      "Predict first: after two steps, where will it be?",
      "先猜一猜：單步兩次後，它會回到哪裡？",
    ),
    glider: t(
      "没有方向指令，五个细胞怎样向前走？单步四次，再和起点比较。",
      "No movement instructions. How do five cells travel? Take four steps and compare with the seed.",
      "沒有方向指令，五個細胞怎樣向前走？單步四次，再和起點比較。",
    ),
    pulsar: t(
      "它看起来复杂，但每个格子仍只做同一个判断。试试三步后是否恢复原样。",
      "It looks complex, but each cell applies the same rule. Does it return after three steps?",
      "它看起來複雜，但每個格子仍只做同一個判斷。試試三步後是否恢復原樣。",
    ),
  };
  function pause() {
    setPlaying(false);
  }
  function load(pattern: Pattern) {
    pause();
    setFlower(pattern);
    dispatch({ type: "load", seed: makePattern(pattern) });
    setMessage("");
    setShareLink("");
  }
  function select(index: number) {
    pause();
    setSelected(index);
  }
  function toggle(index: number) {
    pause();
    setFlower("custom");
    dispatch({ type: "toggle", index });
    setShareLink("");
  }
  useEffect(() => {
    function restore() {
      const raw = new URL(location.href).searchParams.get("garden");
      if (raw === null) return;
      const parsed = decodeSeed(raw);
      setPlaying(false);
      if (parsed) {
        dispatch({ type: "load", ...parsed });
        setFlower("custom");
      }
      setMessage(
        parsed
          ? t(
              "已载入分享的起点。按播放，长出你的版本。",
              "Shared starting point loaded. Press Play to grow your version.",
              "已載入分享的起點。按播放，長出你的版本。",
            )
          : t(
              "花种链接无效，已保留当前花园。",
              "Invalid seed link. Your current garden is unchanged.",
              "花種連結無效，已保留目前花園。",
            ),
      );
    }
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [t]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReduced(media.matches);
      if (media.matches) setPlaying(false);
    };
    motion();
    media.addEventListener("change", motion);
    const visibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) setPlaying(false);
      },
      { threshold: 0 },
    );
    if (root.current) observer.observe(root.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
      if (exportUrl.current) URL.revokeObjectURL(exportUrl.current);
    };
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => dispatch({ type: "step" }), 1000 / speed);
    return () => clearInterval(timer);
  }, [running, speed]);
  async function share() {
    pause();
    const url = new URL(location.href);
    url.searchParams.set("tool", "emergence");
    url.searchParams.set("garden", encodeSeed(board, state.boundary));
    url.hash = "workbench";
    setShareLink(url.href);
    try {
      await navigator.clipboard.writeText(url.href);
      setMessage(
        t(
          "链接已复制。打开后以这一帧作为第 0 代。",
          "Link copied. This frame becomes generation 0 when opened.",
          "連結已複製。開啟後以這一幀作為第 0 代。",
        ),
      );
    } catch {
      setMessage(
        t(
          "请复制下方的花种链接。",
          "Copy the seed link below.",
          "請複製下方的花種連結。",
        ),
      );
    }
  }
  function download() {
    pause();
    if (exportUrl.current) URL.revokeObjectURL(exportUrl.current);
    exportUrl.current = URL.createObjectURL(
      new Blob([gardenSvg(board, state.boundary, generation, locale)], {
        type: "image/svg+xml",
      }),
    );
    const a = document.createElement("a");
    a.href = exportUrl.current;
    a.download = `hohoo-garden-${generation}.svg`;
    document.body.append(a);
    a.click();
    a.remove();
    setMessage(
      t(
        "明信片已生成，SVG 中保留了这一帧的规则和布局。",
        "Postcard generated. The SVG retains this frame’s rule and layout.",
        "明信片已產生，SVG 中保留了這一幀的規則和佈局。",
      ),
    );
  }
  return (
    <div ref={root} className={s.garden}>
      <header className={s.heading}>
        <div>
          <p className={s.kicker}>
            HOHOO / {t("规则的游乐场", "A PLAYGROUND OF RULES", "規則的遊樂場")}
          </p>
          <h3>
            {t("涌现花园", "Emergence garden", "湧現花園")}
            <span aria-hidden="true"> ✳</span>
          </h3>
        </div>
        <p>
          {t(
            "种下几格简单。\n长出一点意外。",
            "Plant something simple.\nGrow something unexpected.",
            "種下幾格簡單。\n長出一點意外。",
          )}
        </p>
      </header>
      <div
        className={s.seeds}
        role="group"
        aria-label={t(
          "选择花种，会替换当前布局",
          "Choose a seed; replaces the current layout",
          "選擇花種，會取代目前佈局",
        )}
      >
        {patterns.map((pattern, i) => (
          <button
            key={pattern}
            aria-pressed={flower === pattern}
            onClick={() => load(pattern)}
          >
            <small>0{i + 1}</small>
            {names[pattern]}
          </button>
        ))}
      </div>
      <p className={s.prompt}>
        {flower === "custom"
          ? t(
              "这是你的花园。修改一个格子，重新观察整片图案。",
              "Your garden. Change one cell, then observe the whole pattern.",
              "這是你的花園。修改一個格子，重新觀察整片圖案。",
            )
          : prompts[flower]}
      </p>
      <div className={s.layout}>
        <div className={s.field}>
          <div className={s.fieldHeader}>
            <span>
              {t("观察场", "OBSERVATION FIELD", "觀察場")} / {COLS} × {ROWS}
            </span>
            <span data-generation={generation}>
              {t("第", "GEN", "第")} {String(generation).padStart(3, "0")}{" "}
              {t("代", "", "代")}
            </span>
          </div>
          <div className={s.transport}>
            <div className={s.tools}>
              <button
                className={s.play}
                disabled={reduced || terminal}
                aria-pressed={running}
                onClick={() => setPlaying(!running)}
              >
                {running
                  ? t("Ⅱ 暂停", "Ⅱ Pause", "Ⅱ 暫停")
                  : t("▷ 播放", "▷ Play", "▷ 播放")}
              </button>
              <button
                onClick={() => {
                  pause();
                  dispatch({ type: "step" });
                }}
              >
                {t("单步 →", "Step →", "單步 →")}
              </button>
              <button
                disabled={state.cursor === 0}
                onClick={() => {
                  pause();
                  dispatch({ type: "seek", cursor: state.cursor - 1 });
                }}
              >
                {t("← 后退", "← Back", "← 後退")}
              </button>
              <button
                onClick={() => {
                  pause();
                  dispatch({ type: "reset" });
                }}
              >
                {t("回到起点", "Reset seed", "回到起點")}
              </button>
              <label>
                {t("节奏", "Tempo", "節奏")}
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  <option value="1">
                    {t("慢 · 1 代/秒", "Slow · 1 gen/s", "慢 · 1 代/秒")}
                  </option>
                  <option value="3">
                    {t("中 · 3 代/秒", "Medium · 3 gen/s", "中 · 3 代/秒")}
                  </option>
                  <option value="6">
                    {t("快 · 6 代/秒", "Fast · 6 gen/s", "快 · 6 代/秒")}
                  </option>
                </select>
              </label>
            </div>
            <label className={s.timeline}>
              {t("回看时间轴", "Rewind the timeline", "回看時間軸")}{" "}
              <span>
                {state.offset} — {state.offset + state.frames.length - 1}
              </span>
              <input
                type="range"
                min="0"
                max={Math.max(1, state.frames.length - 1)}
                value={state.cursor}
                disabled={state.frames.length === 1}
                onChange={(e) => {
                  pause();
                  dispatch({ type: "seek", cursor: Number(e.target.value) });
                }}
              />
            </label>
            <p className={s.hint}>
              {reduced
                ? t(
                    "已遵循系统减少动态效果设置，请用单步观察。",
                    "Reduced motion is enabled. Explore one step at a time.",
                    "已遵循系統減少動態效果設定，請用單步觀察。",
                  )
                : population === 0
                  ? t(
                      "花园暂时安静了。种下几格，再试一次。",
                      "The garden is quiet. Plant a few cells and try again.",
                      "花園暫時安靜了。種下幾格，再試一次。",
                    )
                  : still
                    ? t(
                        "到达静止图案，已停止播放。试着改变一个格子。",
                        "A still pattern. Playback stopped. Try changing one cell.",
                        "到達靜止圖案，已停止播放。試著改變一個格子。",
                      )
                    : t(
                        "播放只在这里发生；离屏或切换标签后暂停。",
                        "Playback stays here; leaving the view or tab pauses it.",
                        "播放只在這裡發生；離屏或切換分頁後暫停。",
                      )}
            </p>
          </div>
          <GardenBoard
            board={board}
            previous={previous}
            trail={trail}
            selected={selected}
            edit={edit}
            zoom={zoom}
            onSelect={select}
            onToggle={toggle}
            onGlider={() => {
              load("glider");
              setMessage(
                t(
                  "小彩蛋：一只没有引擎的飞船。四步之后，它向右下移动一格。",
                  "A tiny easter egg: an engineless ship. Four steps move it one cell diagonally.",
                  "小彩蛋：一隻沒有引擎的飛船。四步之後，它向右下移動一格。",
                ),
              );
            }}
          />
          <div className={s.legend}>
            <span>
              <i data-tone="alive" />
              {t("存活", "Alive", "存活")}
            </span>
            <span>
              <i data-tone="born" />
              {t("新生", "Newborn", "新生")}
            </span>
            <span>
              <i data-tone="trail" />
              {t("最近五代的足迹", "Last five generations", "最近五代的足跡")}
            </span>
          </div>
          <div className={s.tools}>
            <button
              aria-pressed={edit}
              onClick={() => {
                pause();
                setEdit(!edit);
              }}
            >
              {edit
                ? t("种植模式", "Planting mode", "種植模式")
                : t("观察模式", "Inspect mode", "觀察模式")}
            </button>
            <button aria-pressed={zoom} onClick={() => setZoom(!zoom)}>
              {zoom
                ? t("缩小网格", "Fit grid", "縮小網格")
                : t("放大网格", "Enlarge grid", "放大網格")}
            </button>
            <label>
              <input
                type="checkbox"
                checked={trailOn}
                onChange={(e) => setTrailOn(e.target.checked)}
              />
              {t("留下足迹", "Show trails", "留下足跡")}
            </label>
          </div>
          <p className={s.hint}>
            {t(
              "点格子观察；切换种植模式可编辑。方向键移动，回车操作。小彩蛋：在网格中按 G。放大后可横向滚动。",
              "Select a cell to inspect; switch to planting to edit. Arrows move, Enter acts. A little secret: press G in the grid. Scroll horizontally when enlarged.",
              "點格子觀察；切換種植模式可編輯。方向鍵移動，Enter 操作。小彩蛋：在網格中按 G。放大後可橫向捲動。",
            )}
          </p>
        </div>
        <GardenInspector
          board={board}
          previous={previous}
          boundary={state.boundary}
          selected={selected}
          onToggle={toggle}
        />
      </div>
      <div className={s.lower}>
        <div>
          <label className={s.boundary}>
            {t("世界的边界", "The edge of this world", "世界的邊界")}
            <select
              value={state.boundary}
              onChange={(e) => {
                pause();
                dispatch({
                  type: "boundary",
                  boundary: e.target.value === "wrap" ? "wrap" : "closed",
                });
                setShareLink("");
              }}
            >
              <option value="closed">
                {t(
                  "有限花园：外面是空白",
                  "Finite garden: empty outside",
                  "有限花園：外面是空白",
                )}
              </option>
              <option value="wrap">
                {t(
                  "环绕花园：两端相接",
                  "Wraparound: edges meet",
                  "環繞花園：兩端相接",
                )}
              </option>
            </select>
          </label>
          <p className={s.hint}>
            {t(
              `修改格子或边界会从当前布局重新开始；回看保留最近 ${HISTORY_LIMIT} 帧，回看后单步会改写后续。起点可随时恢复。`,
              `Editing cells or edges starts from the current layout. Rewind keeps ${HISTORY_LIMIT} frames; stepping from the past replaces the future. The seed remains resettable.`,
              `修改格子或邊界會從目前佈局重新開始；回看保留最近 ${HISTORY_LIMIT} 幀，回看後單步會改寫後續。起點可隨時還原。`,
            )}
          </p>
        </div>
        <div className={s.souvenir}>
          <p className={s.kicker}>
            {t(
              "带走这片小世界",
              "TAKE A LITTLE WORLD WITH YOU",
              "帶走這片小世界",
            )}
          </p>
          <div className={s.tools}>
            <button onClick={share}>
              {t(
                "分享这一帧的花种",
                "Share this frame as a seed",
                "分享這一幀的花種",
              )}
            </button>
            <button onClick={download}>
              {t("保存 SVG 明信片", "Save SVG postcard", "儲存 SVG 明信片")}
            </button>
            <button
              onClick={() => {
                pause();
                dispatch({ type: "load", seed: Array(SIZE).fill(0) });
                setFlower("custom");
                setShareLink("");
              }}
            >
              {t("清空，自己种", "Clear and plant", "清空，自己種")}
            </button>
          </div>
        </div>
      </div>
      <p role="status" className={s.message}>
        {message}
      </p>
      {shareLink && (
        <label className={s.share}>
          {t(
            "已生成的花种链接（固定为分享时的布局）",
            "Generated seed link (layout captured when shared)",
            "已產生的花種連結（固定為分享時的佈局）",
          )}
          <input
            readOnly
            value={shareLink}
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}
      <details className={s.notes}>
        <summary>
          {t(
            "它和 AI 有什么关系？",
            "What does this have to do with AI?",
            "它和 AI 有什麼關係？",
          )}
        </summary>
        <p>
          {t(
            "这是 Conway 生命游戏的有限网格演示：B3/S23 表示空位有 3 个活邻居时新生，活细胞有 2 或 3 个活邻居时存活。它没有模型训练、意识或规划能力；有趣的是，整体图案可以远比单个格子的规则复杂。",
            "This is a finite-grid implementation of Conway’s Game of Life. B3/S23 means birth with 3 live neighbors and survival with 2 or 3. There is no model training, awareness or planning. The whole pattern can be much more complex than a cell’s rule.",
            "這是 Conway 生命遊戲的有限網格示範：B3/S23 表示空位有 3 個活鄰居時新生，活細胞有 2 或 3 個活鄰居時存活。它沒有模型訓練、意識或規劃能力；有趣的是，整體圖案可以遠比單個格子的規則複雜。",
          )}
        </p>
        <p>
          {t(
            "把这种观察方法带回实验：先看局部状态和规则，再判断整体行为。边界条件会改变结果，这个教学网格不等于无限平面的生命游戏，更不等于真实机器人仿真。",
            "Take the method back to experiments: inspect local state and rules before interpreting behavior. Boundaries affect results. This teaching grid is neither the infinite plane nor a robot simulation.",
            "把這種觀察方法帶回實驗：先看局部狀態和規則，再判斷整體行為。邊界條件會改變結果，這個教學網格不等於無限平面的生命遊戲，更不等於真實機器人模擬。",
          )}
        </p>
        <div className={s.tools}>
          <a href="https://www.scholarpedia.org/article/Game_of_Life">
            {t(
              "规则来源 · Scholarpedia",
              "Rule reference · Scholarpedia",
              "規則來源 · Scholarpedia",
            )}{" "}
            ↗
          </a>
          <Link to="/journey/virtual-lab">
            {t(
              "从规则走向具身实验",
              "Continue to embodied experiments",
              "從規則走向具身實驗",
            )}{" "}
            →
          </Link>
        </div>
      </details>
    </div>
  );
}
