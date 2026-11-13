"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import ReproductionGuide from "./ReproductionGuide";
import evidence from "../generated/embodied-guide.json";
import {
  completionViewUrl,
  readCompletionCase,
} from "../lib/completion-view.mjs";
import type { ContentEntry } from "../lib/site-types";
import s from "./EmbodiedFieldGuide.module.css";

type Copy = readonly [string, string, string];
const cases: Record<string, { title: Copy; reason: Copy }> = {
  正常: {
    title: ["正常", "No fault", "正常"],
    reason: [
      "这条归档中，物理条件和正常执行流程都满足；一个固定回合不代表通用成功率。",
      "This recorded episode satisfies both physical conditions and normal execution. One fixed run is not a general success rate.",
      "這條歸檔中，物理條件與正常執行流程均滿足；一個固定回合不代表通用成功率。",
    ],
  },
  下降短暂缺测: {
    title: [
      "下降时短暂缺测",
      "Temporary observation gap during lowering",
      "下降時短暫缺測",
    ],
    reason: [
      "控制器经历重新验收后恢复，归档终点均有效。终点通过不能代替对恢复过程的检查。",
      "The controller revalidated and recovered; endpoint judgments pass. A passing endpoint does not replace inspection of recovery.",
      "控制器重新驗證後恢復，歸檔終點均有效。終點通過不能代替恢復過程檢查。",
    ],
  },
  下降松爪: {
    title: [
      "下降时松开夹爪",
      "Gripper opens during lowering",
      "下降時鬆開夾爪",
    ],
    reason: [
      "方块因重力落进盒子，物理放置有效，但控制器已因重新验收超时终止。它回答了“物体在哪里”，没有完成正常释放流程。",
      "Gravity placed the cube in the box, but the controller aborted after a revalidation timeout. Physical placement does not establish a completed release workflow.",
      "方塊因重力落進盒子，物理放置有效，但控制器已因重新驗證逾時終止。它回答了物體在哪裡，沒有完成正常釋放流程。",
    ],
  },
  下降永久缺测: {
    title: [
      "下降后持续缺测",
      "Permanent observation loss during lowering",
      "下降後持續缺測",
    ],
    reason: [
      "观察器没有足够的新证据，当前状态为UNKNOWN；这不等于断言物体已掉落。流程已终止，仿真真值的最终物理验收也未通过。",
      "The observer lacks fresh evidence, so current validity is UNKNOWN, not a claim that the object fell. Execution aborted; the separate final physical check also failed.",
      "觀察器缺少新證據，目前為UNKNOWN，不等於斷言物體已掉落。流程已終止，獨立的最終物理驗證也未通過。",
    ],
  },
  释放后推动: {
    title: [
      "放好后被外力推离",
      "Object pushed after release",
      "放好後被外力推離",
    ],
    reason: [
      "曾经满足过放置条件，所以历史记录保留；终点已失效。历史完成时间不能保证下游现在仍可继续动作。",
      "Placement held earlier, so history remains true; endpoint validity is lost. A historical completion time does not establish that downstream actions are safe now.",
      "先前曾滿足放置條件，歷史記錄保留；終點已失效。歷史完成時間不能保證下游現在仍可繼續動作。",
    ],
  },
  释放后静默: {
    title: [
      "释放后观测静默",
      "Observation silence after release",
      "釋放後觀測靜默",
    ],
    reason: [
      "终点重新VALID，但静默期间曾进入UNKNOWN，恢复新包后还需重新收集持续证据。只看最后一行会漏掉中间失效。",
      "The endpoint is VALID again, but silence caused UNKNOWN and fresh packets required a new evidence window. The final row hides that interruption.",
      "終點重新VALID，但靜默期間曾進入UNKNOWN，恢復新封包後仍需重新蒐集持續證據。只看最後一列會漏掉中間失效。",
    ],
  },
  单条坏观测: {
    title: ["注入一条坏观测", "One corrupted observation", "注入一條壞觀測"],
    reason: [
      "物体没有被推动，观察器却曾因坏包立即INVALID，之后重新验收恢复。这暴露了规则对噪声的敏感性，不能说鲁棒感知已经解决。",
      "The object was not pushed, yet the bad packet briefly caused INVALID before revalidation. This exposes noise sensitivity rather than demonstrating robust perception.",
      "物體沒有被推動，觀察器卻曾因壞封包立即INVALID，之後重新驗證恢復。這暴露規則對雜訊的敏感性，不能說穩健感知已解決。",
    ],
  },
  重放旧观测: {
    title: ["持续重放旧观测", "Replay stale observations", "持續重放舊觀測"],
    reason: [
      "数据不断到达，旧采样时间仍不能刷新证据有效期。归档中先UNKNOWN，之后依靠真正的新观测恢复，不是靠重复发送变新鲜。",
      "Packets keep arriving, but their old capture times cannot refresh validity. Recovery requires genuinely fresh observations, not repeated delivery.",
      "資料不斷到達，舊取樣時間仍不能刷新有效期。歸檔先UNKNOWN，之後靠真正的新觀測恢復，不是靠重複傳送變新鮮。",
    ],
  },
};
// Isolate the query reader so the evidence remains pre-rendered on static pages.
function CompletionUrlState({ onChange }: { onChange: (id: string) => void }) {
  const search = useSearchParams().toString();
  useEffect(() => {
    onChange(readCompletionCase(search, evidence.cases, evidence.defaultCase));
  }, [search, onChange]);
  return null;
}
export default function EmbodiedFieldGuide({
  entries,
}: {
  entries: ContentEntry[];
}) {
  const t = useText();
  const [condition, setCondition] = useState(evidence.defaultCase);
  const record = evidence.cases.find((item) => item.id === condition)!;
  const caption = cases[record.name];
  function choose(id: string) {
    setCondition(id);
    // Let Next copy its internal history state and notify query subscribers.
    history.pushState(
      null,
      "",
      completionViewUrl(location.href, id, evidence.cases),
    );
  }
  const article = (slug: string) =>
    entries.find((entry) => entry.id === "doc:embodied-ai/" + slug);
  const sceneA = article("mujoco-first-pick-place"),
    sceneB = article("mujoco-planar-pd");
  return (
    <section
      className={s.root}
      id="embodied-guide"
      aria-labelledby="embodied-guide-title"
    >
      <Suspense fallback={null}>
        <CompletionUrlState onChange={setCondition} />
      </Suspense>
      <header>
        <p className="hh-eyebrow">
          {t(
            "EMBODIED / 场景与证据",
            "EMBODIED / SCENES & EVIDENCE",
            "EMBODIED / 場景與證據",
          )}
        </p>
        <h2 id="embodied-guide-title">
          {t(
            "物体到了，任务就完成了吗？",
            "The object arrived. Is the task complete?",
            "物體到了，任務就完成了嗎？",
          )}
        </h2>
      </header>
      <div className={s.scenes}>
        {sceneA && (
          <Link to={sceneA.href}>
            <span>01 / {t("抓取放置", "Pick and place", "抓取放置")}</span>
            <strong>
              {t(
                "看接触、阶段契约和失败恢复",
                "Study contact, phase contracts and recovery",
                "看接觸、階段契約與失敗恢復",
              )}{" "}
              ↗
            </strong>
          </Link>
        )}
        {sceneB && (
          <Link to={sceneB.href}>
            <span>
              02 / {t("二维力控", "Planar force control", "二維力控")}
            </span>
            <strong>
              {t(
                "看阻尼、观测延迟和参数迁移",
                "Study damping, observation delay and transfer",
                "看阻尼、觀測延遲與參數遷移",
              )}{" "}
              ↗
            </strong>
          </Link>
        )}
      </div>
      <p className={s.scope}>
        {t(
          "两个已有MuJoCo教学场景；不是实时机器人界面，也不代表真机、完整VLA或里程碑已经完成。",
          "Two existing MuJoCo teaching scenes, not a live robot dashboard or proof of real-world/VLA milestone completion.",
          "兩個既有MuJoCo教學場景；不是即時機器人介面，也不代表真機、完整VLA或里程碑已完成。",
        )}
      </p>
      <div className={s.case}>
        <label htmlFor="completion-condition">
          {t(
            "换一个归档故障条件",
            "Choose an archived fault condition",
            "換一個歸檔故障條件",
          )}
        </label>
        <select
          id="completion-condition"
          value={condition}
          onChange={(event) => choose(event.target.value)}
        >
          {evidence.cases.map((item) => (
            <option key={item.id} value={item.id}>
              {t(...cases[item.name].title)}
            </option>
          ))}
        </select>
        <p className={s.scope}>
          {t(
            `原版本8条轨迹 · ${evidence.durationSeconds}s终点读数 · 本页不推进物理仿真`,
            `Eight original-version trajectories · endpoint at ${evidence.durationSeconds}s · no physics runs here`,
            `原版本8條軌跡 · ${evidence.durationSeconds}s終點讀數 · 本頁不推進物理模擬`,
          )}
        </p>
        <dl className={s.readings}>
          <div>
            <dt>
              {t(
                "历史上满足过物理放置",
                "Physical placement held earlier",
                "歷史上曾滿足物理放置",
              )}
            </dt>
            <dd>{record.ever ? t("是", "Yes", "是") : t("否", "No", "否")}</dd>
          </div>
          <div>
            <dt>
              {t(
                "终点证据支持的物理状态",
                "Physical validity at the endpoint",
                "終點證據支持的物理狀態",
              )}
            </dt>
            <dd>
              <code>{record.current}</code>
            </dd>
          </div>
          <div>
            <dt>
              {t(
                "执行流程的完成资格",
                "Qualified execution status",
                "執行流程的完成資格",
              )}
            </dt>
            <dd>
              <code>{record.qualified}</code>
            </dd>
          </div>
        </dl>
        <p role="status" className={s.explanation}>
          {t(...caption.reason)}
        </p>
        <p className={s.scope}>
          {t(
            "独立的最终物理验收",
            "Separate final physical check",
            "獨立的最終物理驗證",
          )}
          {t("：", ": ", "：")}
          {record.physical
            ? t("通过", "Passed", "通過")
            : t("未通过", "Failed", "未通過")}
          {t("。", ". ", "。")}
          {t(
            "这与观察器是否拥有新证据分开。",
            "This is separate from whether the observer has fresh evidence.",
            "這與觀察器是否擁有新證據分開。",
          )}
        </p>
      </div>
      <details className={s.architecture}>
        <summary>
          {t(
            "并排看完整归档判定",
            "Compare the archived outcomes",
            "並排看完整歸檔判定",
          )}
        </summary>
        <div
          className={s.tableWrap}
          tabIndex={0}
          role="region"
          aria-label={t(
            "归档判定表，可左右滚动",
            "Archived outcomes, horizontally scrollable",
            "歸檔判定表，可左右捲動",
          )}
        >
          <table>
            <caption>
              {t(
                "每行一条轨迹，三个读数不是三次独立实验。",
                "One trajectory per row; three judgments are not three independent trials.",
                "每列一條軌跡，三個讀數不是三次獨立實驗。",
              )}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t("条件", "Condition", "條件")}</th>
                <th scope="col">
                  {t("历史放置", "Placed earlier", "歷史放置")}
                </th>
                <th scope="col">
                  {t("终点有效性", "Endpoint validity", "終點有效性")}
                </th>
                <th scope="col">
                  {t("流程资格", "Qualification", "流程資格")}
                </th>
              </tr>
            </thead>
            <tbody>
              {evidence.cases.map((item) => (
                <tr key={item.name}>
                  <th scope="row">{t(...cases[item.name].title)}</th>
                  <td>
                    {item.ever ? t("是", "Yes", "是") : t("否", "No", "否")}
                  </td>
                  <td>
                    <code>{item.current}</code>
                  </td>
                  <td>
                    <code>{item.qualified}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details className={s.architecture}>
        <summary>
          {t(
            "把三个判定放回系统中",
            "Place the judgments in the system",
            "把三種判定放回系統",
          )}
        </summary>
        <dl>
          <div>
            <dt>{t("动作流程", "Execution", "動作流程")}</dt>
            <dd>
              {t(
                "接近、抓取、搬运、下降、释放；阶段契约异常进入恢复预算，预算耗尽进入终止状态。终止之后怎样退出，还需要独立的动作策略与验收。",
                "Approach, grasp, transfer, lower and release. Contract violations enter budgeted recovery; an exhausted budget terminates execution. Exit actions need their own policy and validation.",
                "接近、抓取、搬運、下降、釋放；階段契約異常進入恢復預算，預算耗盡則終止。終止後怎樣退出，仍需獨立的動作策略與驗證。",
              )}
            </dd>
          </div>
          <div>
            <dt>{t("观测证据", "Observation evidence", "觀測證據")}</dt>
            <dd>
              {t(
                "捕获时间与新鲜度 → 位置、速度和接触 → 持续窗口。缺少新证据时是UNKNOWN，不凭旧包维持VALID。",
                "Capture time and freshness → position, velocity and contact → a sustained window. Missing fresh evidence yields UNKNOWN, not VALID sustained by old packets.",
                "擷取時間與新鮮度 → 位置、速度與接觸 → 持續窗口。缺少新證據時為UNKNOWN，不憑舊封包維持VALID。",
              )}
            </dd>
          </div>
          <div>
            <dt>{t("完成资格", "Completion qualification", "完成資格")}</dt>
            <dd>
              {t(
                "物理证据还要结合释放意图与执行终态。释放意图来自指令，不是夹爪执行确认；旁路观察器不控制机械臂。",
                "Physical evidence also needs release intent and execution status. Intent is a command, not actuator confirmation; the sidecar observer does not control the arm.",
                "物理證據仍要結合釋放意圖與執行終態。釋放意圖來自指令，不是夾爪執行確認；旁路觀察器不控制機械臂。",
              )}
            </dd>
          </div>
        </dl>
      </details>
      <aside className={s.version}>
        <strong>
          {t(
            "复现与复用，请分清版本",
            "Distinguish reproduction from reuse",
            "重現與重用，請分清版本",
          )}
        </strong>
        <p>
          {t(
            "这些读数来自原版零传输延迟归档。后续已修正新包处理顺序与释放时间边界；不能用这8条轨迹证明旧实现普遍正确。下方命令复现原版，复用观察器请先读修订说明。",
            "These readings come from the original zero-transport-delay archive. Later fixes changed packet-processing order and release-time handling. Eight trajectories do not establish general correctness. Commands below reproduce the archive; read the correction before reusing its observer.",
            "讀數來自原版零傳輸延遲歸檔。後續已修正新封包處理順序與釋放時間邊界；不能用8條軌跡證明舊實作普遍正確。下方指令重現原版，重用觀察器前請先讀修訂說明。",
          )}
        </p>
        <a href={evidence.correction} target="_blank" rel="noreferrer">
          {t(
            "修订代码与回归说明",
            "Corrected code and regression notes",
            "修訂程式碼與回歸說明",
          )}{" "}
          ↗
        </a>
      </aside>
      <nav
        className={s.sources}
        aria-label={t(
          "完成判据来源",
          "Completion evidence sources",
          "完成判據來源",
        )}
      >
        <Link to={evidence.source.doc}>
          {t(
            "读完整案例与中间状态",
            "Read the case and intermediate states",
            "讀完整案例與中間狀態",
          )}{" "}
          →
        </Link>
        <a href={evidence.source.evidence} target="_blank" rel="noreferrer">
          {t(
            "原始轨迹与审计",
            "Original trajectories and audit",
            "原始軌跡與稽核",
          )}{" "}
          ↗
        </a>
      </nav>
      <ReproductionGuide id="embodied-ai/mujoco-qualified-completion" />
    </section>
  );
}
