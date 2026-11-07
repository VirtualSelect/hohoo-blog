"use client";
import { useText } from "./Shell";
import evidence from "../generated/question-evidence.json";
import { checkTimeoutClaim } from "../lib/question-evidence.mjs";
import s from "./QuestionStudio.module.css";

import type { QuestionId } from "../lib/research-cases";
export type { QuestionId } from "../lib/research-cases";
export function resultFor(id: QuestionId, variant: number): boolean {
  if (id === "java") return evidence.java[variant].count === 1;
  if (id === "cache")
    return evidence.cache[variant + 1].total < evidence.cache[0].total;
  if (id === "robot") return evidence.robot[variant].stable;
  const { source, value } = claimFor(variant);
  return checkTimeoutClaim(source, value) === "supported";
}
function claimFor(variant: number) {
  const ids = ["prod-v2", "prod-v1", "dev-v2", "prod-v2"];
  const source = evidence.registry.find((row) => row.id === ids[variant])!;
  return {
    source,
    value:
      variant === 3
        ? evidence.registry.find((row) => row.id === "prod-v1")!.timeout
        : source.timeout,
  };
}
export default function QuestionScene({
  id,
  variant,
  revealed,
  onChange,
}: {
  id: QuestionId;
  variant: number;
  revealed: boolean;
  onChange: (value: number) => void;
}) {
  const t = useText();
  if (id === "java") {
    const count = evidence.java[variant].count;
    return (
      <>
        <label className={s.control}>
          {t("换一个重试条件", "Change the retry condition", "換一個重試條件")}
          <select
            value={variant}
            onChange={(e) => onChange(Number(e.target.value))}
          >
            <option value={0}>
              {t(
                "回复丢失 · 没有幂等键",
                "Lost reply · no idempotency key",
                "回覆遺失 · 沒有冪等鍵",
              )}
            </option>
            <option value={1}>
              {t(
                "回复丢失 · 复用同一个键",
                "Lost reply · reuse the same key",
                "回覆遺失 · 重用同一個鍵",
              )}
            </option>
            <option value={2}>
              {t(
                "已有回复 · 服务重启后再重试",
                "Reply received · retry after restart",
                "已有回覆 · 服務重啟後再重試",
              )}
            </option>
          </select>
        </label>
        <div className={s.sequence}>
          <div>
            <span>01</span>
            <strong>{t("请求送达", "Request arrives", "請求送達")}</strong>
            <small>POST /effect</small>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>02</span>
            <strong>{t("执行加一", "Apply +1", "執行加一")}</strong>
            <small>
              {t("副作用已发生", "Effect recorded", "副作用已發生")}
            </small>
          </div>
          <i aria-hidden="true">→</i>
          <div className={s.fault}>
            <span>03</span>
            <strong>
              {variant === 2
                ? t("服务重启", "Server restarts", "服務重啟")
                : t("回复丢失", "Reply lost", "回覆遺失")}
            </strong>
            <small>
              {t("客户端再次请求", "Client retries", "用戶端再次請求")}
            </small>
          </div>
        </div>
        <div className={s.readout}>
          <span>{t("最终执行次数", "Final effect count", "最終執行次數")}</span>
          <strong>{revealed ? count : "?"}</strong>
          <small>
            {t("归档计数器结果", "Archived counter result", "歸檔計數器結果")}
          </small>
        </div>
        <p className={s.note}>
          {t(
            "本地 HTTP 实验的过程示意，不会发送请求或执行真实操作。",
            "An illustration of the local HTTP experiment. No requests or real actions are sent.",
            "本機 HTTP 實驗的過程示意，不會傳送請求或執行真實操作。",
          )}
        </p>
      </>
    );
  }
  if (id === "cache") {
    const rows = [evidence.cache[0], evidence.cache[variant + 1]];
    return (
      <>
        <label className={s.control}>
          {t("缓存路径", "Cache path", "快取路徑")}
          <select
            value={variant}
            onChange={(e) => onChange(Number(e.target.value))}
          >
            <option value={0}>
              {t(
                "每次重新计算签名",
                "Recompute the signature each time",
                "每次重新計算簽章",
              )}
            </option>
            <option value={1}>
              {t(
                "初始化时固定签名",
                "Freeze the signature at initialization",
                "初始化時固定簽章",
              )}
            </option>
          </select>
        </label>
        <p className={s.diagramLabel}>
          {t(
            "投影工作量：12 Token → 续算 4 Token",
            "Projection work: 12 tokens → continue with 4",
            "投影工作量：12 Token → 續算 4 Token",
          )}
        </p>
        <div className={s.tokenStrip} aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} data-cached={i < 8}>
              {i < 8 ? "·" : "+"}
            </span>
          ))}
        </div>
        <div className={s.bars}>
          {rows.map((row, index) => (
            <div key={row.mode}>
              <div className={s.barLabel}>
                <span>
                  {index === 0
                    ? t("完整重算", "Full recompute", "完整重算")
                    : t("缓存续算", "Cached continuation", "快取續算")}
                </span>
                <strong>{revealed ? `${row.total} μs` : "—"}</strong>
              </div>
              <div className={s.barTrack}>
                <div
                  data-cache={index === 1}
                  style={{
                    width: revealed
                      ? `${(row.total / Math.max(...evidence.cache.map((r) => r.total))) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className={s.note}>
          {t(
            "归档中位数 · 两层 NumPy 教学模型 · 本机 CPU；不是大模型服务基准。",
            "Archived medians · two-layer NumPy teaching model · local CPU, not an LLM service benchmark.",
            "歸檔中位數 · 兩層 NumPy 教學模型 · 本機 CPU；不是大模型服務基準。",
          )}
        </p>
      </>
    );
  }
  if (id === "robot") {
    const row = evidence.robot[variant];
    const max = Math.max(...evidence.robot.map((r) => r.overshoot));
    return (
      <>
        <div className={s.pairedControls}>
          <label className={s.control}>
            {t("质量", "Mass", "質量")}
            <select
              value={row.mass}
              onChange={(e) =>
                onChange(
                  evidence.robot.findIndex(
                    (r) =>
                      r.mass === Number(e.target.value) &&
                      r.damping === row.damping,
                  ),
                )
              }
            >
              <option value={1}>1 kg</option>
              <option value={2}>2 kg</option>
            </select>
          </label>
          <label className={s.control}>
            {t("阻尼 Kd", "Damping Kd", "阻尼 Kd")}
            <select
              value={row.damping}
              onChange={(e) =>
                onChange(
                  evidence.robot.findIndex(
                    (r) =>
                      r.mass === row.mass &&
                      r.damping === Number(e.target.value),
                  ),
                )
              }
            >
              {[0, 18, 36].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={s.motionPlot}>
          <div className={s.targetLine}>
            <span>{t("目标", "Target", "目標")}</span>
          </div>
          <div className={s.travelLine} />
          <div
            className={s.massDot}
            hidden={!revealed}
            style={{
              left: `${20 + (revealed ? (row.overshoot / max) * 65 : 0)}%`,
            }}
            aria-hidden="true"
          />
          <p>
            {revealed ? `${row.overshoot} mm` : "?"}
            <small>
              {t("最大 x 超调", "Maximum x overshoot", "最大 x 超調")}
            </small>
          </p>
        </div>
        <div className={s.metrics}>
          <span>
            {t("4 秒末位置误差", "Position error at 4 s", "4 秒末位置誤差")}
            <strong>{revealed ? `${row.error} mm` : "—"}</strong>
          </span>
          <span>
            {t(
              "最后 0.3 秒稳定",
              "Stable for the last 0.3 s",
              "最後 0.3 秒穩定",
            )}
            <strong>
              {revealed
                ? row.stable
                  ? t("是", "Yes", "是")
                  : t("否", "No", "否")
                : "—"}
            </strong>
          </span>
        </div>
        <p className={s.note}>
          {t(
            "六组 MuJoCo 归档结果。圆点只标记最大超调，不播放或插值运动轨迹。",
            "Six archived MuJoCo cases. The dot marks maximum overshoot, not an animated or interpolated trajectory.",
            "六組 MuJoCo 歸檔結果。圓點只標記最大超調，不播放或插值運動軌跡。",
          )}
        </p>
      </>
    );
  }
  const { source, value } = claimFor(variant);
  const result = checkTimeoutClaim(source, value);
  return (
    <>
      <label className={s.control}>
        {t("选择一份候选回答", "Choose a candidate answer", "選擇一份候選回答")}
        <select
          value={variant}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          <option value={0}>
            {t(
              "当前生产配置 · 值相符",
              "Current production config · matching value",
              "目前正式配置 · 值相符",
            )}
          </option>
          <option value={1}>
            {t(
              "引用旧版生产配置",
              "Cite an old production revision",
              "引用舊版正式配置",
            )}
          </option>
          <option value={2}>
            {t(
              "引用开发环境配置",
              "Cite the development environment",
              "引用開發環境配置",
            )}
          </option>
          <option value={3}>
            {t(
              "引用当前配置 · 回答值被改写",
              "Current source · altered answer value",
              "引用目前配置 · 回答值被改寫",
            )}
          </option>
        </select>
      </label>
      <div className={s.claimSheet}>
        <span>
          {t(
            "问题：payments / prod / v2 的读取超时？",
            "Question: read timeout for payments / prod / v2?",
            "問題：payments / prod / v2 的讀取逾時？",
          )}
        </span>
        <div>
          <small>{t("引用文档", "Cited document", "引用文件")}</small>
          <code>{source.id}</code>
        </div>
        <div>
          <small>{t("真实引文", "Exact source quote", "真實引文")}</small>
          <code>read_timeout_ms={source.timeout}</code>
        </div>
        <div>
          <small>{t("回答值", "Answer value", "回答值")}</small>
          <code>{value}</code>
        </div>
      </div>
      <p className={s.contractStatus}>
        {revealed
          ? {
              supported: t(
                "此字段符合检查",
                "This field passes",
                "此欄位符合檢查",
              ),
              scope: t(
                "拒绝：环境不符",
                "Rejected: scope mismatch",
                "拒絕：環境不符",
              ),
              revision: t(
                "拒绝：版本过期",
                "Rejected: stale revision",
                "拒絕：版本過期",
              ),
              value: t(
                "拒绝：数值不符",
                "Rejected: value mismatch",
                "拒絕：數值不符",
              ),
            }[result as "supported" | "scope" | "revision" | "value"]
          : t(
              "引文存在，等待核对答案。",
              "The quote exists. Does it support the answer?",
              "引文存在，等待核對答案。",
            )}
      </p>
      <p className={s.note}>
        {t(
          "使用文章中的原创合成配置，只演示单字段范围、版本与值检查；不是模型输出或完整 Java 契约。",
          "Uses the article’s synthetic configurations. Demonstrates scope, revision and value checks for one field, not model output or the full Java contract.",
          "使用文章中的原創合成配置，只示範單欄位範圍、版本與值檢查；不是模型輸出或完整 Java 契約。",
        )}
      </p>
    </>
  );
}
