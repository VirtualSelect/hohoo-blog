import reproduction from "@site/data/reproduction.json";
import tracks from "@site/data/learning-paths.json";
import { reproductionScript } from "../lib/reproduction-script.mjs";
import { useText } from "./Shell";

export default function ReproductionGuide({ id }: { id: string }) {
  const t = useText();
  const record = reproduction[id as keyof typeof reproduction];
  if (!record) return null;
  const step = tracks
    .map((track) => track.steps.find((step) => step.doc === id))
    .find(Boolean);
  const notice = step && "reviewNotice" in step ? step.reviewNotice : undefined;
  const fixHref = notice && "fixHref" in notice ? notice.fixHref : undefined;
  const code =
    (fixHref
      ? `# Historical experiment revision. Corrections: ${fixHref}\n`
      : "") + reproductionScript(record);
  return (
    <details className="reproduction-guide" id="reproduction-setup">
      <summary>
        {fixHref
          ? t(
              "复现原始实验 · 另有修正版",
              "Reproduce the original experiment · corrections available",
              "重現原始實驗 · 另有修正版",
            )
          : t(
              "从干净环境复现 · 本篇固定版本",
              "Reproduce from a clean checkout · this article’s revision",
              "從乾淨環境重現 · 本篇固定版本",
            )}
      </summary>
      {fixHref && (
        <p>
          {t(
            "下方命令检出原实验版本，用于核对历史结果，包含文中已说明的缺陷。要学习或复用判定器，请先看",
            "The commands below check out the original experiment revision, including the documented defects, to verify historical results. Before reusing the observer, inspect the",
            "下方指令檢出原實驗版本，用於核對歷史結果，包含文中已說明的缺陷。要學習或重用判定器，請先看",
          )}{" "}
          <a href={fixHref} target="_blank" rel="noopener noreferrer">
            {t(
              "修正版与回归命令",
              "corrections and regression commands",
              "修正版與回歸指令",
            )}{" "}
            ↗
          </a>
          {t(
            "。修正版结果与原始轨迹分开保存。",
            ". Corrected results remain separate from the original trajectories.",
            "。修正版結果與原始軌跡分開儲存。",
          )}
        </p>
      )}
      <p>
        {t(
          "以下为 Windows PowerShell，Python 3.12。请复制后整块执行；克隆、检出、安装或运行失败会停止，不会接着在错误版本上审计。使用新的目录，每篇固定提交不同，首篇的旧提交不包含后续实验。",
          "Windows PowerShell with Python 3.12. Copy and run the whole block. Clone, checkout, installation or execution failures stop the block before auditing the wrong revision. Use a new directory: each article pins its own revision, and the first revision does not contain later experiments.",
          "以下為 Windows PowerShell，Python 3.12。請複製後整塊執行；複製倉庫、檢出、安裝或執行失敗會停止，不會接著在錯誤版本上稽核。使用新目錄，每篇固定提交不同，首篇的舊提交不包含後續實驗。",
        )}
      </p>
      <pre>
        <code className="language-powershell">{code}</code>
      </pre>
      <p>
        {t(
          "预期得到原始轨迹、摘要和审计结果。目录名包含提交编号，已存在时会停止，不覆盖旧工程。相邻文章可能共用实验入口；是否需要重跑请看正文。以上命令不调用模型；先运行数值部分，视频回放按正文单独执行。后续手动运行时请重新指定 .venv 中的解释器，块内的 $py 变量不会保留。",
          "Expect raw trajectories, summaries and audit results. The study directory includes the revision; an existing directory stops setup without replacing it. Adjacent articles may share a runner; check the article before rerunning. No model calls are made. Video replay is separate. For later manual commands, specify the interpreter in .venv again: the block-local $py variable is not retained.",
          "預期得到原始軌跡、摘要與稽核結果。目錄名包含提交編號，已存在時會停止，不覆蓋舊工程。相鄰文章可能共用實驗入口；是否需要重跑請看正文。以上指令不呼叫模型；先執行數值部分，影片回放依正文單獨執行。後續手動執行時請重新指定 .venv 中的解譯器，區塊內的 $py 變數不會保留。",
        )}
      </p>
      <p>
        {t(
          "排错：找不到实验目录先核对提交；导入失败检查解释器与安装环境；OpenGL 报错仅影响需要渲染的步骤。Linux/macOS 将解释器替换为 .venv/bin/python，尚未在这些平台复测。",
          "Troubleshooting: a missing experiment directory usually means the wrong revision; import failures require checking the interpreter and environment. OpenGL errors concern rendering steps. On Linux/macOS use .venv/bin/python; those platforms have not been retested.",
          "排錯：找不到實驗目錄先核對提交；匯入失敗檢查解譯器與安裝環境；OpenGL 錯誤僅影響需要渲染的步驟。Linux/macOS 將解譯器替換為 .venv/bin/python，尚未在這些平台複測。",
        )}
      </p>
      <a
        href={`https://github.com/VirtualSelect/${record.repository}/tree/${record.commit}/${record.directory}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("查看本篇固定代码", "Inspect the pinned code", "查看本篇固定程式碼")}{" "}
        ↗
      </a>
    </details>
  );
}
