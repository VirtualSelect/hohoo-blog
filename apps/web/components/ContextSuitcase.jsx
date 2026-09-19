"use client";
import { useState } from "react";
import { useText } from "./Shell";
import styles from "./LearningExercises.module.css";

export default function ContextSuitcase() {
  const t = useText();
  const [capacity, setCapacity] = useState(14);
  const [chosen, setChosen] = useState(["history", "source"]);
  const [compressed, setCompressed] = useState(false);
  const packs = [
    {
      id: "history",
      cost: 4,
      title: t("前几轮对话", "Previous turns", "前幾輪對話"),
      detail: t(
        "保留用户偏好和已有约定。",
        "Preserves preferences and earlier agreements.",
        "保留使用者偏好和已有約定。",
      ),
    },
    {
      id: "source",
      cost: compressed ? 2 : 6,
      title: t("参考资料", "Reference material", "參考資料"),
      detail: compressed
        ? t(
            "只保留摘要，原句与细节可能丢失。",
            "Summary only: exact wording and details may be lost.",
            "只保留摘要，原句與細節可能遺失。",
          )
        : t(
            "保留完整教学资料片段。",
            "Keeps the full teaching excerpt.",
            "保留完整教學資料片段。",
          ),
    },
    {
      id: "extra",
      cost: 5,
      title: t("无关聊天", "Unrelated chat", "無關聊天"),
      detail: t(
        "占用空间，但不能支持当前问题。",
        "Uses space without supporting this question.",
        "佔用空間，但不能支持目前問題。",
      ),
    },
  ];
  const used =
    4 +
    packs.filter((p) => chosen.includes(p.id)).reduce((n, p) => n + p.cost, 0);
  const reserved = 3;
  const excess = used + reserved - capacity;
  return (
    <section className={styles.exercise} aria-labelledby="suitcase-title">
      <p className="eyebrow">
        {t("动手理解 / 上下文", "Try it / Context", "動手理解 / 上下文")}
      </p>
      <h2 id="suitcase-title">
        {t("上下文行李箱", "The context suitcase", "上下文行李箱")}
      </h2>
      <p>
        {t(
          "给有限空间装行李：保留什么，舍弃什么？这里的格数是人为设定的教学单位，不是任何模型的 Token 计数。",
          "Pack a limited space: what stays and what goes? These slots are invented teaching units, not any model’s token counts.",
          "給有限空間裝行李：保留什麼，捨棄什麼？這裡的格數是人為設定的教學單位，不是任何模型的 Token 計數。",
        )}
      </p>
      <label htmlFor="context-capacity">
        {t("容量", "Capacity", "容量")}：{capacity}
      </label>
      <input
        id="context-capacity"
        type="range"
        min="8"
        max="24"
        value={capacity}
        onChange={(e) => setCapacity(Number(e.target.value))}
      />
      <p>
        {t(
          "固定放入：规则 2 格 + 当前问题 2 格；另外预留回答 3 格。",
          "Always packed: instructions 2 slots + current question 2 slots; reserve 3 more for output.",
          "固定放入：規則 2 格 + 目前問題 2 格；另外預留回答 3 格。",
        )}
      </p>
      <fieldset>
        <legend>
          {t("选择携带的材料", "Choose materials", "選擇攜帶的材料")}
        </legend>
        {packs.map((p) => (
          <label key={p.id}>
            <input
              type="checkbox"
              checked={chosen.includes(p.id)}
              onChange={() =>
                setChosen((values) =>
                  values.includes(p.id)
                    ? values.filter((v) => v !== p.id)
                    : [...values, p.id],
                )
              }
            />
            <span>
              {p.title} · {p.cost}
              <small>{p.detail}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <label>
        <input
          type="checkbox"
          checked={compressed}
          onChange={(e) => setCompressed(e.target.checked)}
        />
        {t(
          "把参考资料改成摘要",
          "Summarize the reference",
          "把參考資料改成摘要",
        )}
      </label>
      <progress
        max={capacity}
        value={Math.min(capacity, used + reserved)}
        aria-label={t(
          "教学容量使用情况",
          "Teaching capacity usage",
          "教學容量使用情況",
        )}
      />
      <div className={styles.result} role="status">
        <strong>
          {excess > 0
            ? t(
                `超出 ${excess} 格`,
                `${excess} slots over capacity`,
                `超出 ${excess} 格`,
              )
            : t(
                `还剩 ${-excess} 格`,
                `${-excess} slots free`,
                `還剩 ${-excess} 格`,
              )}
        </strong>
        <p>
          {t("输入占用", "Input", "輸入佔用")} {used} +{" "}
          {t("回答预留", "Output reserve", "回答預留")} {reserved} / {capacity}
        </p>
        <p>
          {!chosen.includes("source")
            ? t(
                "没有带参考资料，无法依据它回答。",
                "The reference is absent, so it cannot support an answer.",
                "沒有帶參考資料，無法依據它回答。",
              )
            : compressed
              ? t(
                  "压缩节省空间，但需要核对摘要是否保留关键条件。",
                  "Compression saves space; check whether key conditions survived.",
                  "壓縮節省空間，但需要核對摘要是否保留關鍵條件。",
                )
              : t(
                  "资料已保留，但有资料不等于回答一定正确。",
                  "The reference is present; that does not guarantee a correct answer.",
                  "資料已保留，但有資料不等於回答一定正確。",
                )}
        </p>
      </div>
      <p className={styles.muted}>
        {t(
          "这不是费用估算器，也不自动截断输入。真实限制和超长输入处理取决于模型与服务。",
          "Not a pricing calculator or automatic truncation tool. Real limits and overflow behavior depend on the model and service.",
          "這不是費用估算器，也不自動截斷輸入。真實限制和超長輸入處理取決於模型與服務。",
        )}
      </p>
    </section>
  );
}
