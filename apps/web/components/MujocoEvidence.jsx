"use client";
import { useRef, useState } from "react";
import { useText } from "./Shell";
import evidence from "@site/data/practice/mujoco.json";
import s from "./ResearchEvidence.module.css";
const names = {
  approach: ["接近", "Approach", "接近"],
  descend: ["下降", "Descend", "下降"],
  close: ["闭合", "Close", "閉合"],
  lift: ["抬起", "Lift", "抬起"],
  transfer: ["搬运", "Transfer", "搬運"],
  lower: ["降低", "Lower", "降低"],
  release: ["释放", "Release", "釋放"],
  retreat: ["退回", "Retreat", "退回"],
  settle: ["落定", "Settle", "落定"],
};
export default function MujocoEvidence() {
  const t = useText(),
    video = useRef(null),
    desired = useRef(null);
  const [index, setIndex] = useState(0),
    [phase, setPhase] = useState("lift"),
    [error, setError] = useState(false);
  const run = evidence.runs[index],
    stage = run.stages.find((x) => x.phase === phase);
  const seek = (p) => {
    setPhase(p.phase);
    desired.current = p.start;
    const v = video.current;
    if (v.readyState >= 1) {
      v.currentTime = p.start;
      v.pause();
    } else v.load();
  };
  const root =
    "https://github.com/VirtualSelect/hohoo-embodied-agent/tree/" +
    evidence.commit +
    "/evidence/" +
    evidence.recording +
    "/" +
    run.episode;
  return (
    <section
      className={s.panel}
      aria-label={t(
        "MuJoCo 实验对照台",
        "MuJoCo evidence comparison",
        "MuJoCo 實驗對照台",
      )}
    >
      <p>
        {t(
          "同一个控制程序，只改变拾取目标的横向偏移。这里重放已有记录，不重新运行仿真。",
          "The same controller, with only pickup x offset changed. This viewer replays saved records, not a new simulation.",
          "同一個控制程式，只改變拾取目標的橫向偏移。此處重放既有紀錄，不重新執行模擬。",
        )}
      </p>
      <div
        className={s.controls}
        role="group"
        aria-label={t("选择偏移组", "Offset condition", "選擇偏移組")}
      >
        {evidence.runs.map((r, i) => (
          <button
            key={r.offsetMm}
            type="button"
            aria-pressed={i === index}
            onClick={() => {
              video.current?.pause();
              desired.current = null;
              setIndex(i);
              setPhase("lift");
              setError(false);
            }}
          >
            {r.offsetMm} mm
          </button>
        ))}
      </div>
      <div className={s.layout}>
        <div>
          <video
            key={run.video}
            ref={video}
            controls
            preload="none"
            playsInline
            width="960"
            height="640"
            src={run.video}
            poster={run.poster}
            aria-label={
              t("真实仿真录像", "Recorded simulation", "真實模擬錄影") +
              " " +
              run.offsetMm +
              " mm"
            }
            onLoadedMetadata={() => {
              if (desired.current !== null) {
                video.current.currentTime = desired.current;
                desired.current = null;
              }
            }}
            onError={() => setError(true)}
          />
          {error && (
            <p role="status">
              {t(
                "录像加载失败，可通过下方证据链接查看。",
                "Video unavailable. Open the evidence link below.",
                "錄影載入失敗，可透過下方證據連結查看。",
              )}
            </p>
          )}
          <div
            className={s.controls}
            role="group"
            aria-label={t("定位实验阶段", "Seek to a phase", "定位實驗階段")}
          >
            {run.stages.map((p) => (
              <button
                type="button"
                key={p.phase}
                aria-pressed={phase === p.phase}
                onClick={() => seek(p)}
              >
                {t(...names[p.phase])}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className={s.metric} aria-live="polite">
            <strong>
              {run.summary.success
                ? t("满足本轮成功条件", "Met this protocol", "滿足本輪成功條件")
                : t("未抬起方块", "Cube not lifted", "未抬起方塊")}
            </strong>
            <br />
            {t(
              "第一回合记录；每组共三次，无随机化。",
              "Episode 1 of three identical initializations per condition; no randomization.",
              "第一回合紀錄；每組共三次，無隨機化。",
            )}
          </p>
          <p>
            {t("方块高度 / 秒", "Cube height / seconds", "方塊高度 / 秒")} ·{" "}
            {t(
              "虚线为 0.10 m 抬起阈值",
              "Dashed line: 0.10 m lift threshold",
              "虛線為 0.10 m 抬起閾值",
            )}
          </p>
          <svg
            className={s.chart}
            viewBox="0 0 500 170"
            role="img"
            aria-label={t(
              "从保存的轨迹绘制方块高度；原始记录为50Hz，图示数值保留四位小数。",
              "Cube height from saved 50 Hz records, rounded to four decimals for display.",
              "由保存的50Hz軌跡繪製方塊高度，圖示數值保留四位小數。",
            )}
          >
            <line x1="35" y1="145" x2="485" y2="145" stroke="currentColor" />
            <line
              x1="35"
              y1="80"
              x2="485"
              y2="80"
              stroke="currentColor"
              strokeDasharray="5 5"
              opacity=".4"
            />
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              points={run.trajectory
                .map(([x, y]) =>
                  [35 + (x / 9.2) * 450, 145 - (y / 0.2) * 130].join(","),
                )
                .join(" ")}
            />
            <line
              x1={35 + (stage.start / 9.2) * 450}
              x2={35 + (stage.start / 9.2) * 450}
              y1="15"
              y2="145"
              stroke="currentColor"
              strokeDasharray="2 4"
            />
            <text x="0" y="18" fill="currentColor" fontSize="11">
              0.2 m
            </text>
            <text x="0" y="83" fill="currentColor" fontSize="11">
              0.1
            </text>
            <text x="35" y="165" fill="currentColor" fontSize="11">
              0 s
            </text>
            <text x="450" y="165" fill="currentColor" fontSize="11">
              9.2 s
            </text>
          </svg>
          <p aria-live="polite">
            {t(...names[phase])} · {stage.start.toFixed(1)} s<br />
            {t(
              "阶段首条采样高度",
              "First sample height in phase",
              "階段首筆取樣高度",
            )}
            ：{stage.observation.cube_z.toFixed(4)} m
          </p>
        </div>
      </div>
      <details>
        <summary>
          {t("查看阶段记录表", "View phase samples", "查看階段紀錄表")}
        </summary>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                {[
                  t("阶段", "Phase", "階段"),
                  t("采样时间 / s", "Sample time / s", "取樣時間 / s"),
                  t("高度 / m", "Height / m", "高度 / m"),
                  t("夹指接触", "Finger contact", "夾指接觸"),
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {run.stages.map((p) => (
                <tr key={p.phase}>
                  <th scope="row">{t(...names[p.phase])}</th>
                  <td>{p.observation.time.toFixed(3)}</td>
                  <td>{p.observation.cube_z.toFixed(4)}</td>
                  <td>
                    {p.observation.finger_contact
                      ? t("有", "Yes", "有")
                      : t("无", "No", "無")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p>
        <a href={root} target="_blank" rel="noopener noreferrer">
          {t(
            "原始 CSV、视频与状态记录",
            "Original CSV, video and states",
            "原始 CSV、錄影與狀態紀錄",
          )}{" "}
          ↗
        </a>
      </p>
    </section>
  );
}
